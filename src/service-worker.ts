/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// See: https://developers.google.com/web/tools/workbox/modules
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
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

logger.log("MANIFEST", MANIFEST);
logger.log("Version", APP_VERSION_STRING);

precacheAndRoute(MANIFEST);

// Set up App Shell-style routing, so that all navigation requests
// are fulfilled with your index.html shell. Learn more at
// https://developers.google.com/web/fundamentals/architecture/app-shell
const fileExtensionRegexp = new RegExp("/[^/?]+\\.[^/]+$");
registerRoute(
  // Return false to exempt requests from being fulfilled by index.html.
  ({ request, url }: { request: Request; url: URL }) => {
    // If this isn't a navigation, skip.
    if (request.mode !== "navigate") {
      return false;
    }

    // If this is a URL that starts with /_, skip.
    if (url.pathname.startsWith("/_")) {
      return false;
    }

    // If this looks like a URL for a resource, because it contains
    // a file extension, skip.
    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }

    // Return true to signal that we want to use the handler.
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + "/index.html")
);

// An example runtime caching route for requests that aren't handled by the
// precache, in this case same-origin .png requests like those from in public/
registerRoute(
  ({ url }) => url.origin === self.location.origin,
  // Customize this strategy as needed, e.g., by changing to CacheFirst.
  new StaleWhileRevalidate({
    cacheName: "any",
    plugins: [
      // Ensure that once this runtime cache reaches a maximum size the
      // least-recently used images are removed.
      new ExpirationPlugin({ maxEntries: 50 })
    ]
  })
);

// This allows the web app to trigger skipWaiting via
// registration.waiting.postMessage({type: 'SKIP_WAITING'})
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Any other custom service worker logic can go here.

