import { runInAction } from "mobx";
import { SemVer } from "semver";
import { Logger } from "../types/Logger";
import { APP_VERSION, getAppStores } from "./MainApp";
import { enqueueErrorSnackbar, enqueueSuccessSnackbar } from "./Notice";
import * as SWR from "../types/ServiceWorkerRegistration";

const logger = Logger("Versioning");

export async function fetchLatestVersionViaAPI(): Promise<SemVer | undefined> {
  logger.log("Fetch latest version via API");
  try {
    const reply = await fetch(`${process.env.PUBLIC_URL}/api/version`);
    const version = new SemVer(await reply.text());
    return version;
  } catch (error) {
    logger.error("Error fetching latest version via API:", error);
    return undefined;
  }
}

export async function refreshLatestVersion() {
  return new Promise<void>((resolve, reject) => {
    runInAction(async () => {
      const { app } = getAppStores();

      // Reset to null to indicate that we are fetching the latest version
      app.latestVersion = null;
      // Fetch the latest version, can be undefined indicating that the latest version is not available
      const version = (await SWR.getWaitingSWVersion()) || (await fetchLatestVersionViaAPI());

      runInAction(() => {
        app.latestVersion = version;
        resolve();
      });
    });
  });
}

export async function checkForUpdates() {
  logger.log("Check for updates, current SW version", (await SWR.getCurrentSWVersion())?.version);

  await SWR.update();
  /*
  ALGO:
  If there is no installing service worker, refreshLatestVersion() will not be called. This is usually because there
  is no update available or the network is down.

  We call refreshLatestVersion() manually to check if there is a new version available. It is important so that 
  app.latestVersion is updated. In this case, the method will fetch the latest version via API and update the 
  latestVersion observable. app.latestVersion will probably be undefined if no update available or the network is down

  It is also possible that the service worker can not change the state from installing to waiting due to parsing error
  But this is out of our control, so we just ignore it
  */
  if ((await SWR.isInstalling()) === false) {
    await refreshLatestVersion();
  }
}

export async function onLatestVersionChange(newVer: SemVer | null | undefined, oldVer: SemVer | null | undefined) {
  if (newVer === undefined) {
    enqueueErrorSnackbar(logger, "Failed to fetch latest version", 5000);
  } else if (newVer === null) {
    // UX: RFC: Should we show a snackbar when fetching?
    // enqueueSuccessSnackbar(logger, "Fetching latest version", 5000);
  } else {
    /*
    Note: Is it possible that the service worker has an update
    but the version of the application and the waiting service worker are the same?
    */

    const waitingVer = await SWR.getWaitingSWVersion();
    if (newVer.compare(APP_VERSION) !== 0 || waitingVer !== undefined) {
      enqueueSuccessSnackbar(logger, `New version available: ${newVer}`, 5000);

      if (waitingVer !== undefined) {
        // TODO
      }
    } else {
      enqueueSuccessSnackbar(logger, "There are currently no updates available", 5000);
    }
  }
}
