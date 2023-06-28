import { Backdrop, Card, Divider, Typography } from "@mui/material";
import { makeAutoObservable, action } from "mobx";
import { observer } from "mobx-react-lite";
import { useAppStores } from "./MainApp";
import { lightTheme, darkTheme, AppTheme, AppThemeInfo } from "./Theme";
import { useBackdropDialog } from "./Util";
import { ObserverEnumSelect } from "./ObserverEnumSelect";
import { ObserverCheckbox } from "./ObserverCheckbox";

export class Preferences {
  private isDialogOpen: boolean = false;

  // Local storage
  private isGoogleAnalyticsEnabledState: boolean = false;
  private themeTypeState: AppTheme = AppTheme.Dark;

  constructor() {
    makeAutoObservable(this);

    this.isGoogleAnalyticsEnabledState = localStorage.getItem("googleAnalyticsEnabled") === "true";

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
