/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// See: https://developers.google.com/web/tools/workbox/modules
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";
import LoggerImpl from "./types/LoggerImpl";
import { APP_VERSION_STRING } from "./Version";

declare const self: ServiceWorkerGlobalScope;

/*
XXX:
For some reason, "./Logger" cannot be imported here. It exports a function and causes the following error:
TypeError: Cannot read properties of undefined (reading 'register')

Instead, we use "./types/LoggerImpl" which exports a class only. We use it directly to create a logger instance.
This is also the reason why we separate the Logger interface and its implementation in two files.
*/
const logger = new LoggerImpl("Service Worker");

clientsClaim();

// See: https://developer.chrome.com/docs/workbox/modules/workbox-precaching/
const MANIFEST = self.__WB_MANIFEST;

precacheAndRoute(MANIFEST);

// Runtime caching route for requests that aren't handled by the precache
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/api/") === false,
  new StaleWhileRevalidate({
    cacheName: "non-precache",
    plugins: [new ExpirationPlugin({ maxEntries: 50 })]
  })
);

// This allows the web app to trigger skipWaiting via
// registration.waiting.postMessage({type: 'SKIP_WAITING'})
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

logger.log("Precache", MANIFEST);
logger.log("Version", APP_VERSION_STRING);
