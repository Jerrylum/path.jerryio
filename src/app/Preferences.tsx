import { Backdrop, Card, Divider, Typography } from "@mui/material";
import { makeAutoObservable, action } from "mobx";
import { observer } from "mobx-react-lite";
import { useAppStores } from "../core/MainApp";
import { lightTheme, darkTheme, AppTheme, AppThemeInfo } from "./Theme";
import { clamp, useBackdropDialog } from "../core/Util";
import { ObserverEnumSelect } from "../component/ObserverEnumSelect";
import { ObserverCheckbox } from "../component/ObserverCheckbox";
import { ObserverInput } from "../component/ObserverInput";

export class Preferences {
  private isDialogOpen: boolean = false;

  // Local storage
  private maxHistoryState: number = 50;
  private isGoogleAnalyticsEnabledState: boolean = false;
  private themeTypeState: AppTheme = AppTheme.Dark;

  constructor() {
    makeAutoObservable(this);

    this.pullFromLocalStorage();
    window.addEventListener("storage", () => this.pullFromLocalStorage());
  }

  pullFromLocalStorage() {
    // Max history
    this.maxHistoryState = parseInt(localStorage.getItem("maxHistory") ?? "50");

    // Is Google Analytics enabled
    this.isGoogleAnalyticsEnabledState = localStorage.getItem("googleAnalyticsEnabled") === "true";

    // Theme
    const themeInStr = localStorage.getItem("theme");
    if (themeInStr === "light") this.themeTypeState = AppTheme.Light;
    else this.themeTypeState = AppTheme.Dark;
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

  get maxHistory() {
    return this.maxHistoryState;
  }

  set maxHistory(value: number) {
    this.maxHistoryState = value;

    localStorage.setItem("maxHistory", value.toString());
  }

  get isGoogleAnalyticsEnabled() {
    return this.isGoogleAnalyticsEnabledState;
  }

  set isGoogleAnalyticsEnabled(value: boolean) {
    this.isGoogleAnalyticsEnabledState = value;

    localStorage.setItem("googleAnalyticsEnabled", value ? "true" : "false");
  }

  get themeType(): AppTheme {
    return this.themeTypeState;
  }

  set themeType(value: AppTheme) {
    this.themeTypeState = value;

    if (value === AppTheme.Light) localStorage.setItem("theme", "light");
    else localStorage.setItem("theme", "dark");
  }

  get theme(): AppThemeInfo {
    if (this.themeTypeState === AppTheme.Light) return lightTheme;
    else return darkTheme;
  }
}

const PreferencesDialog = observer((props: {}) => {
  const { appPreferences } = useAppStores();

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
          enumType={AppTheme}
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
