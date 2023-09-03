import { Button, Card } from "@mui/material";
import { Box } from "@mui/system";
import { observer } from "mobx-react-lite";
import { Modal } from "../component/Modal";
import { MarkdownOverwrittenComponents } from "./MarkdownSupport";
import { action } from "mobx";
import React from "react";
import { LayoutType } from "../core/Layout";
import { getAppStores } from "../core/MainApp";
import { LayoutContext } from "./Layouts";
import WelcomeMDX from "./Welcome.mdx";

export const WelcomeModalSymbol = Symbol("WelcomeModalSymbol");

export const WelcomeModal = observer(() => {
  const { appPreferences, modals } = getAppStores();

  const rawGAEnabled = localStorage.getItem("googleAnalyticsEnabled");
  const [isGAEnabled, setIsGAEnabled] = React.useState(rawGAEnabled !== "false"); // UX: Default to true

  React.useEffect(() => {
    setIsGAEnabled(rawGAEnabled !== "false");
    if (rawGAEnabled === null) modals.open(WelcomeModalSymbol); // UX: Show welcome page if user is new
  }, [modals, rawGAEnabled]);

  // UX: Save user preference when user closes the modal
  const onClose = () => {
    setIsGAEnabled(action((curr: boolean) => (appPreferences.isGoogleAnalyticsEnabled = curr)));
    modals.close(WelcomeModalSymbol);
  };

  const isMobileLayout = React.useContext(LayoutContext) === LayoutType.Mobile;

  return (
    <Modal symbol={WelcomeModalSymbol} onClose={onClose}>
      <Card id="welcome-modal" className="modal-container">
        {isMobileLayout && (
          <Box sx={{ textAlign: "right" }}>
            <Button onClick={onClose}>Continue</Button>
          </Box>
        )}
        <WelcomeMDX {...{ isGAEnabled, setIsGAEnabled }} components={MarkdownOverwrittenComponents} />
        {isMobileLayout && (
          <Box sx={{ textAlign: "center" }}>
            <Button onClick={onClose}>Begin</Button>
          </Box>
        )}
      </Card>
    </Modal>
  );
});
