import { Logger } from "./types/Logger";

const logger = Logger("Service Worker Registration");

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === "[::1]" ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

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

  window.addEventListener("load", () => doRegister(`${process.env.PUBLIC_URL}/service-worker.js`));
}

export function unregister() {
  if ("serviceWorker" in navigator === false) return;

  navigator.serviceWorker.ready
    .then(registration => registration.unregister())
    .catch(error => logger.error(error.message));
}

function doRegister(swUrl: string) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => (registration.onupdatefound = onUpdateFound))
    .catch(error => logger.error("Error during service worker registration:", error));

  if (navigator.serviceWorker.controller) {
    logger.log("Service worker is active.");
  }

  navigator.serviceWorker.ready
    .then(registration => doPostUpdateFound(registration))
    .catch(error => logger.error(error.message));
}

function doPostUpdateFound(registration: ServiceWorkerRegistration) {
  const waitingWorker = registration.waiting;
  if (waitingWorker === null) return;

  logger.log("New service worker is installed and waiting to be activated. New version will be used when all tabs for this page are closed (not reload).");
}

function onUpdateFound(this: ServiceWorkerRegistration) {
  const installingWorker = this.installing;
  if (installingWorker === null) return;
  installingWorker.onstatechange = onInstallingWorkerStateChange;

  logger.log("New service worker found. Installing...");
}

function onInstallingWorkerStateChange(this: ServiceWorker) {
  if (this.state === "installed") {
    const currentSW = navigator.serviceWorker.controller; // the old one
    if (currentSW !== null) {
      logger.log(
        "New service worker installed. Precached content has been fetched. New version will be used when all tabs for this page are closed (not reload)."
      );
    } else {
      logger.log("Service worker installed. Precached content has been fetched. App is ready for offline use.");
    }
  }
}

