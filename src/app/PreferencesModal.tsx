import { Card, Divider, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { getAppStores } from "../core/MainApp";
import { AppThemeType } from "./Theme";
import { clamp } from "../core/Util";
import { ObserverEnumSelect } from "../component/ObserverEnumSelect";
import { ObserverCheckbox } from "../component/ObserverCheckbox";
import { ObserverInput } from "../component/ObserverInput";
import { Modal } from "../component/Modal";

export const PreferencesModalSymbol = Symbol("PreferencesModalSymbol");

export const PreferencesModal = observer(() => {
  const { appPreferences } = getAppStores();

  return (
    <Modal symbol={PreferencesModalSymbol}>
      <Card id="preferences-modal" className="modal-container">
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
    </Modal>
  );
});
