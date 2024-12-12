import { makeAutoObservable, intercept } from "mobx";
import { AppThemeType } from "@app/Theme";
import { LayoutType } from "./Layout";

export class Preferences {
  private disposers: (() => void)[] = []; // intercept() disposer

  // Local storage
  public maxHistory: number = 50;
  public isGoogleAnalyticsEnabled: boolean = false;
  public isExperimentalFeaturesEnabled: boolean = false;
  public themeType: AppThemeType = AppThemeType.Dark;
  public layoutType: LayoutType = LayoutType.Classic;
  public lastSelectedFormat: string = "path.jerryio v0.1.x (cm, rpm)";

  // Not in local storage
  public isSpeedCanvasVisible: boolean = true; // In classic layout only
  public isRightSectionVisible: boolean = true; // In classic layout only

  constructor() {
    makeAutoObservable(this);

    this.linkLocalStorage();
    window.addEventListener("storage", () => this.linkLocalStorage());
  }

  private link(key: keyof this, storageKey: string) {
    const item = localStorage.getItem(storageKey);
    if (item !== null) {
      try {
        this[key] = JSON.parse(item);
      } catch (e) {
        this[key] = item as any; // ALGO: Legacy string support
      }
    }

    // ALGO: intercept() invokes the callback even if the value is the same
    return intercept(this, key, change => {
      localStorage.setItem(storageKey, JSON.stringify(change.newValue));
      return change;
    });
  }

  private linkLocalStorage() {
    this.disposers.forEach(disposer => disposer());
    this.disposers = [
      this.link("maxHistory", "maxHistory"),
      this.link("isGoogleAnalyticsEnabled", "googleAnalyticsEnabled"),
      this.link("isExperimentalFeaturesEnabled", "experimentalFeaturesEnabled"),
      this.link("themeType", "theme"),
      this.link("layoutType", "layout"),
      this.link("lastSelectedFormat", "lastSelectedFormat")
    ];
  }
}

// ALGO: This methods is used to get preference from localStorage before Preferences is initialized
export function getPreference<T extends {}>(key: string, def: T): T {
  const item = localStorage.getItem(key);
  if (item !== null) {
    try {
      return JSON.parse(item);
    } catch (e) {
      return def; // ALGO: No legacy string support
    }
  }
  return def;
}

const localIsExperimentalFeaturesEnabled: boolean = getPreference("experimentalFeaturesEnabled", false);

export function isExperimentalFeaturesEnabled(): boolean {
  return localIsExperimentalFeaturesEnabled;
}
