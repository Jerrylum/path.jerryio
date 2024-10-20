import { makeAutoObservable, reaction } from "mobx";
import { getAppStores } from "./MainApp";

// observable class
export class GoogleAnalytics {
  readonly GTAG = "G-LLQRVD0VMQ"; // cspell:disable-line

  private loaded: boolean = false;

  private loadGA() {
    if (this.loaded) return;
    this.loaded = true;

    if (window.dataLayer !== undefined) return;
    window.dataLayer = window.dataLayer || [];

    // load GA script
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.GTAG}`;
    script.async = true;
    document.body.appendChild(script);

    this.gtag("js", new Date());
    this.gtag("config", this.GTAG);
  }

  private init() {
    const { appPreferences } = getAppStores();

    reaction(
      () => appPreferences.isGoogleAnalyticsEnabled,
      (newVal: boolean) => {
        if (newVal) this.loadGA();
        // @ts-ignore
        window["ga-disable-" + this.GTAG] = !newVal;
      },
      { fireImmediately: true }
    );
  }

  public gtag(...args: any[]) {
    if (!this.loaded) return;

    window.dataLayer?.push(arguments);
  }

  constructor() {
    makeAutoObservable(this);

    // ALGO: Do not use init() here, because it will be called before appStores is initialized
    setTimeout(this.init.bind(this), 0);
  }
}

declare global {
  interface Window {
    dataLayer: any[] | undefined;
  }
}
