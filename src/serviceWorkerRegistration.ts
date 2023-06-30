
export function register() {
  // if (process.env.NODE_ENV !== "production") return; // TEST: remove this line to test service worker in development
  if ("serviceWorker" in navigator === false) return;

  const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
  // NOTE: This code is from the original create-react-app service worker registration code
  // NOTE: It is better to leave PUBLIC_URL as an empty string
  // Our service worker won't work if PUBLIC_URL is on a different origin
  // from what our page is served on. This might happen if a CDN is used to
  // serve assets; see https://github.com/facebook/create-react-app/issues/2374
  if (publicUrl.origin !== window.location.origin) return;

  window.addEventListener("load", () => {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
    registerValidSW(swUrl);
  });
}

export function unregister() {
  if ("serviceWorker" in navigator === false) return;

  navigator.serviceWorker.ready
    .then(registration => registration.unregister())
    .catch(error => console.error(error.message));
}

function registerValidSW(swUrl: string) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker === null) return;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log(
                "New content is available and will be used when all " +
                  "tabs for this page are closed. See https://cra.link/PWA."
              );
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              console.log("Content is cached for offline use.");
            }
          }
        };
      };
    })
    .catch(error => {
      console.error("Error during service worker registration:", error);
    });
}
