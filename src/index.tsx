import React from "react";
import ReactDOM from "react-dom/client";
import Root from "./Root";
import * as SWR from "./core/ServiceWorkerRegistration";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

// See: https://deanhume.com/displaying-a-new-version-available-progressive-web-app/
// See: https://web.dev/service-worker-lifecycle/
// See: https://web.dev/service-worker-caching-and-http-caching/
// See: https://web.dev/progressive-web-apps/
SWR.register();
