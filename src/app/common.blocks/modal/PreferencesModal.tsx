import { Card, Divider, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { getAppStores } from "@core/MainApp";
import { AppThemeType } from "@app/Theme";
import { clamp } from "@core/Util";
import { FormEnumSelect } from "@app/component.blocks/FormEnumSelect";
import { FormCheckbox } from "@app/component.blocks/FormCheckbox";
import { ObserverInput } from "@app/component.blocks/ObserverInput";
import { Modal } from "./Modal";
import { enqueueInfoSnackbar } from "@app/Notice";
import { Logger } from "@core/Logger";

import "./PreferencesModal.scss";

export const PreferencesModalSymbol = Symbol("PreferencesModalSymbol");

export const PreferencesModal = observer(() => {
  const logger = Logger("Preferences");
  const { appPreferences } = getAppStores();

  return (
    <Modal symbol={PreferencesModalSymbol}>
      <Card id="PreferencesModal" className="Modal-Container">
        <Typography className="PreferencesModal-Title">General</Typography>
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

        <Typography className="PreferencesModal-Title">Appearance</Typography>
        <FormEnumSelect
          sx={{ width: "8rem" }}
          label="Theme"
          enumValue={appPreferences.themeType}
          onEnumChange={v => (appPreferences.themeType = v)}
          enumType={AppThemeType}
        />

        <Divider />

        <Typography className="PreferencesModal-Title">Other</Typography>
        <FormCheckbox
          label="Enable Google Analytics"
          checked={appPreferences.isGoogleAnalyticsEnabled}
          onCheckedChange={v => (appPreferences.isGoogleAnalyticsEnabled = v)}
        />
        <FormCheckbox
          label="Enable Experimental Features"
          checked={appPreferences.isExperimentalFeaturesEnabled}
          onCheckedChange={v => {
            appPreferences.isExperimentalFeaturesEnabled = v;
            enqueueInfoSnackbar(logger, "Please refresh the page to apply this change.", 5000);
          }}
        />
      </Card>
    </Modal>
  );
});
