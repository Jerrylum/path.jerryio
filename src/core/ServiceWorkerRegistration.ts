import { SemVer } from "semver";
import { Logger } from "./Logger";
import { messageSW, Workbox } from "workbox-window";
import { refreshLatestVersion } from "./Versioning";
import { GetVersionMessage, VersionResponse } from "./ServiceWorkerMessages";

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

  const regOption: RegistrationOptions = { updateViaCache: "none" };
  wb = new Workbox(`${process.env.PUBLIC_URL}/service-worker.js`, regOption);

  isUsingServiceWorker = true;

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

  if (navigator.serviceWorker.controller) {
    logger.log("Service worker is controlling this page.");
  }
}

export function unregister() {
  if ("serviceWorker" in navigator === false) return;

  isUsingServiceWorker = false;

  navigator.serviceWorker.ready
    .then(registration => registration.unregister())
    .catch(error => logger.error(error.message));
}
