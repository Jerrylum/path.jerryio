import { SemVer } from "semver";
import { Logger } from "./Logger";
import { messageSW, Workbox } from "workbox-window";
import { refreshLatestVersion, reportVersions } from "./Versioning";
import {
  ClientsCountResponse,
  GetClientsCountMessage,
  GetVersionMessage,
  VersionResponse
} from "./ServiceWorkerMessages";

const logger = Logger("Service Worker Registration");

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === "[::1]" ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

let wb: Workbox | undefined = undefined;

let isUsingServiceWorker = false;

export async function getControllingClientsCount(): Promise<number> {
  if (isUsingServiceWorker === false) return 0;

  const current = navigator.serviceWorker.controller;
  if (!current) return 0;

  const reply = (await messageSW(current, {
    type: "GET_CLIENTS_COUNT"
  } as GetClientsCountMessage)) as ClientsCountResponse;

  return reply;
}

export async function getCurrentSWVersion(): Promise<SemVer | undefined> {
  if (isUsingServiceWorker === false) return undefined;

  const current = navigator.serviceWorker.controller;
  if (!current) return undefined;

  // ALGO: Do not use wb.messageSW because it might send message to waiting SW (if any)

  const reply = (await messageSW(current, { type: "GET_VERSION" } as GetVersionMessage)) as VersionResponse;
  const version = new SemVer(reply);

  return version;
}

export async function getWaitingSWVersion(): Promise<SemVer | undefined> {
  if (isUsingServiceWorker === false) return undefined;

  const reg = await navigator.serviceWorker.getRegistration();
  const waiting = reg?.waiting;
  if (!waiting) return undefined;

  const reply = (await messageSW(waiting, { type: "GET_VERSION" } as GetVersionMessage)) as VersionResponse;
  const version = new SemVer(reply);

  return version;
}

export async function update(): Promise<boolean> {
  if (isUsingServiceWorker === false) return false;

  await wb!.update();
  return true;
}

export async function isInstalling(): Promise<boolean> {
  if (isUsingServiceWorker === false) return false;

  const reg = await navigator.serviceWorker.getRegistration();

  return reg?.installing !== null;
}

export function register() {
  // if (process.env.NODE_ENV !== "production") return; // TEST: disable this line to test service worker in development
  if (isLocalhost) return unregister(); // TEST: disable this line to test service worker in localhost
  if ("serviceWorker" in navigator === false) return;

  const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
  // NOTE: This code is from the original create-react-app service worker registration code
  // NOTE: It is better to leave PUBLIC_URL as an empty string
  // Our service worker won't work if PUBLIC_URL is on a different origin
  // from what our page is served on. This might happen if a CDN is used to
  // serve assets; see https://github.com/facebook/create-react-app/issues/2374
  if (publicUrl.origin !== window.location.origin) return;

  if (isUsingServiceWorker) return;

  isUsingServiceWorker = true;

  const regOption: RegistrationOptions = { updateViaCache: "none" };
  wb = new Workbox(`${process.env.PUBLIC_URL}/service-worker.js`, regOption);

  wb.addEventListener("installing", event => {
    logger.log("Installing service worker");
  });

  wb.addEventListener("installed", event => {
    // NOTE: it seems like event.isUpdate is 100% reliable
    if (event.isUpdate) {
      logger.log("New service worker installed. Precached content has been fetched.");
    } else {
      logger.log("Service worker installed. Precached content has been fetched.");
    }
  });

  wb.addEventListener("waiting", event => {
    logger.log(
      "New service worker is waiting to be activated. New version will be used when all tabs for this page are closed (not reload)."
    );
    refreshLatestVersion();
  });

  wb.addEventListener("activated", event => {
    logger.log("Service worker is activated.");
  });

  wb.register().catch(error => logger.error("Error during service worker registration:", error));

  reportVersions();

  /*
  Note:
  
  For example, if there are two tabs open, both of their versions are:
  Tab1: app 0.2.17, controller 0.2.17, waiting undefined
  Tab2: app 0.2.17, controller 0.2.17, waiting undefined
  Now, if you reload tab1 and there is an update available, the versions will be:
  Tab1: app 0.2.17, controller 0.2.17, waiting 0.2.18
  Tab2: app 0.2.17, controller 0.2.17, waiting 0.2.18
  But if you hard reload tab1, the versions will be:
  Tab1: app 0.2.18, controller undefined, waiting 0.2.18
  Tab2: app 0.2.17, controller 0.2.17, waiting 0.2.18
  Note that the controller version is undefined in tab1.

  See: https://stackoverflow.com/questions/51597231/register-service-worker-after-hard-refresh

  It is question about how can we guarantee that the service worker after being 'activated' is also controlling the page?
  And the answer is no, usually page after hard reload are not controlled by the service worker.

  Therefore, the following code handles the above cases:
  */
  navigator.serviceWorker.getRegistration().then(function (reg) {
    // There's an active SW, but no controller for this tab.
    if (reg?.active && !navigator.serviceWorker.controller) {
      // Perform a soft reload to load everything from the SW and get
      // a consistent set of resources.
      window.location.reload();
    }
  });
}

export function unregister() {
  if ("serviceWorker" in navigator === false) return;

  isUsingServiceWorker = false;

  navigator.serviceWorker.ready
    .then(registration => registration.unregister())
    .catch(error => logger.error(error.message));
}
