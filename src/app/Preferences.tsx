import { Backdrop, Card, Divider, Typography } from "@mui/material";
import { makeAutoObservable, action, intercept } from "mobx";
import { observer } from "mobx-react-lite";
import { getAppStores } from "../core/MainApp";
import { AppThemeType } from "./Theme";
import { clamp } from "../core/Util";
import { ObserverEnumSelect } from "../component/ObserverEnumSelect";
import { ObserverCheckbox } from "../component/ObserverCheckbox";
import { ObserverInput } from "../component/ObserverInput";
import { useBackdropDialog } from "../core/Hook";
import { LayoutType } from "./Layout";

export class Preferences {
  private isDialogOpen: boolean = false;
  private disposers: (() => void)[] = []; // intercept() disposer

  // Local storage
  public maxHistory: number = 50;
  public isGoogleAnalyticsEnabled: boolean = false;
  public themeType: AppThemeType = AppThemeType.Dark;
  public layoutType: LayoutType = LayoutType.CLASSIC;

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
      this.link("themeType", "theme"),
      this.link("layoutType", "layout")
    ];
  }

  close() {
    this.isDialogOpen = false;
  }

  open() {
    this.isDialogOpen = true;
  }

  get isOpen() {
    return this.isDialogOpen;
  }
}

const PreferencesDialog = observer((props: {}) => {
  const { appPreferences } = getAppStores();

  useBackdropDialog(appPreferences.isOpen, () => appPreferences.close());

  if (!appPreferences.isOpen) return null;

  return (
    <Backdrop
      className="preferences-dialog"
      sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}
      open={true}
      onClick={action(() => appPreferences.close())}
      tabIndex={-1}>
      <Card className="preferences-card" onClick={e => e.stopPropagation()}>
        <Typography className="title">General</Typography>
        <ObserverInput
          sx={{ width: "10rem" }}
          label="Max Undo Operations"
          getValue={() => appPreferences.maxHistory.toString()}
          setValue={v => (appPreferences.maxHistory = clamp(parseInt(v), 10, 1000))}
          isValidIntermediate={v => v === "" || new RegExp("^[1-9][0-9]*$").test(v)}
          isValidValue={v => new RegExp("^[1-9][0-9]*$").test(v)}
          numeric
        />

        <Divider />

        <Typography className="title">Appearance</Typography>
        <ObserverEnumSelect
          sx={{ width: "8rem" }}
          label="Theme"
          enumValue={appPreferences.themeType}
          onEnumChange={v => (appPreferences.themeType = v)}
          enumType={AppThemeType}
        />

        <Divider />

        <Typography className="title">Other</Typography>
        <ObserverCheckbox
          label="Enable Google Analytics"
          checked={appPreferences.isGoogleAnalyticsEnabled}
          onCheckedChange={v => (appPreferences.isGoogleAnalyticsEnabled = v)}
        />
      </Card>
    </Backdrop>
  );
});

export { PreferencesDialog };
