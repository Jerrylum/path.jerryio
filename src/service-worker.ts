/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// See: https://developers.google.com/web/tools/workbox/modules
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";
import LoggerImpl from "./core/LoggerImpl";
import { APP_VERSION_STRING } from "./Version";
import { ClientsCountResponse, Message, SkipWaitingResponse, VersionResponse, isMessage } from "./core/ServiceWorkerMessages";

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

self.addEventListener("message", event => {
  if (isMessage(event.data) === false) return;
  const msg = event.data as Message;

  if (msg.type === "GET_VERSION") {
    event.ports[0].postMessage(APP_VERSION_STRING as VersionResponse);
  } else if (msg.type === "GET_CLIENTS_COUNT") {
    self.clients.matchAll({ includeUncontrolled: false }).then(clients => {
      event.ports[0].postMessage(clients.length as ClientsCountResponse);
    });
  } else if (msg.type === "SKIP_WAITING") {
    self.skipWaiting();
    event.ports[0].postMessage(undefined as SkipWaitingResponse);
  }
});

logger.log("Precache", MANIFEST);
logger.log("Version", APP_VERSION_STRING); // IMPORTANT: Include the version string in service worker
