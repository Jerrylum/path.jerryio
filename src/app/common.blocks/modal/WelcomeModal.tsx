import { Button, Card } from "@mui/material";
import { Box } from "@mui/system";
import { observer } from "mobx-react-lite";
import { Modal } from "./Modal";
import { MarkdownOverwrittenComponents } from "@app/MarkdownSupport";
import { action } from "mobx";
import React from "react";
import { LayoutContext, LayoutType } from "@core/Layout";
import { getAppStores } from "@core/MainApp";
import WelcomeMDX from "./WelcomeForOthers.mdx";
import WelcomeForBraveMDX from "./WelcomeForBrave.mdx";
import { isBraveBrowser } from "@core/Util";

import "./WelcomeModal.scss";

export const WelcomeModalSymbol = Symbol("WelcomeModalSymbol");

export const WelcomeModal = observer(() => {
  const { appPreferences, ui } = getAppStores();

  const rawGAEnabled = localStorage.getItem("googleAnalyticsEnabled");
  const [isGAEnabled, setIsGAEnabled] = React.useState(rawGAEnabled !== "false"); // UX: Default to true

  const isBrave = isBraveBrowser();

  React.useEffect(() => {
    setIsGAEnabled(rawGAEnabled !== "false");
    if (rawGAEnabled === null) ui.openModal(WelcomeModalSymbol); // UX: Show welcome page if user is new
  }, [ui, rawGAEnabled]);

  // UX: Save user preference when user closes the modal
  const onClose = () => {
    // Get the latest value of isGAEnabled and save it to localStorage
    setIsGAEnabled(action((curr: boolean) => (appPreferences.isGoogleAnalyticsEnabled = curr && isBrave === false)));
    ui.closeModal(WelcomeModalSymbol);
  };

  const isMobileLayout = React.useContext(LayoutContext) === LayoutType.Mobile;

  return (
    <Modal symbol={WelcomeModalSymbol} onClose={onClose}>
      <Card id="WelcomeModal" className="Modal-Container">
        {isMobileLayout && (
          <Box textAlign="right">
            <Button onClick={onClose}>Continue</Button>
          </Box>
        )}
        {isBrave ? (
          <WelcomeForBraveMDX components={MarkdownOverwrittenComponents} />
        ) : (
          <WelcomeMDX {...{ isGAEnabled, setIsGAEnabled }} components={MarkdownOverwrittenComponents} />
        )}
        {isMobileLayout && (
          <Box textAlign="center">
            <Button onClick={onClose}>Begin</Button>
          </Box>
        )}
      </Card>
    </Modal>
  );
});
