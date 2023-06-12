import { Backdrop, Card, Theme, Typography } from "@mui/material";
import { makeAutoObservable, action } from "mobx"
import { observer } from "mobx-react-lite";
import { useAppStores } from "./MainApp";
import { lightTheme, darkTheme, AppTheme, AppThemeInfo } from "./Theme";


export class Preferences {
  isDialogOpen: boolean = false;
  //
  isGoogleAnalyticsEnabledState: boolean = false;
  themeTypeState: AppTheme = AppTheme.Dark;

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
  const { preferences } = useAppStores();

  if (!preferences.isOpen) return null;

  return (
    <Backdrop
      className="preferences-dialog"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={true}
      onClick={action(() => preferences.close())} >
      <Card className="preferences-card" onClick={(e) => e.stopPropagation()}>
        <Typography variant="h6" gutterBottom>Preferences</Typography>
      </Card>
    </Backdrop>
  )
});

export { PreferencesDialog };
