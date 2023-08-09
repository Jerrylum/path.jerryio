import { Backdrop, Card, Typography } from "@mui/material";
import { makeAutoObservable, action } from "mobx";
import { observer } from "mobx-react-lite";
import { APP_VERSION, getAppStores } from "../core/MainApp";
import { useBackdropDialog } from "../core/Hook";
import React from "react";
import Welcome from "./Welcome.mdx";
import { MarkdownOverwrittenComponents } from "./MarkdownSupport";

export enum HelpPage {
  None,
  Welcome,
  About
}

export class Help {
  private page: HelpPage = HelpPage.None;

  constructor() {
    makeAutoObservable(this);
  }

  close() {
    this.page = HelpPage.None;
  }

  open(page: HelpPage) {
    this.page = page;
  }

  get isOpen() {
    return this.page !== HelpPage.None;
  }

  get currentPage() {
    return this.page;
  }
}

const HelpDialog = observer((props: {}) => {
  const { help, appPreferences } = getAppStores();

  const rawGAEnabled = localStorage.getItem("googleAnalyticsEnabled");
  const [isGAEnabled, setIsGAEnabled] = React.useState(rawGAEnabled !== "false"); // UX: Default to true

  React.useEffect(() => {
    setIsGAEnabled(rawGAEnabled !== "false");
    if (rawGAEnabled === null) help.open(HelpPage.Welcome); // UX: Show welcome page if user is new
  }, [help, rawGAEnabled]);

  const onClose = action(() => {
    help.close();
    appPreferences.isGoogleAnalyticsEnabled = isGAEnabled;
  });

  useBackdropDialog(help.isOpen, onClose);

  if (!help.isOpen) return null;

  return (
    <Backdrop
      className="help-dialog"
      sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}
      open={true}
      onClick={onClose}
      tabIndex={-1}>
      {help.currentPage === HelpPage.Welcome && (
        <Card className="help-welcome-page" onClick={e => e.stopPropagation()} tabIndex={1000}>
          <Welcome {...{ isGAEnabled, setIsGAEnabled }} components={MarkdownOverwrittenComponents} />
        </Card>
      )}
      {help.currentPage === HelpPage.About && (
        <Card className="help-about-page" onClick={e => e.stopPropagation()} tabIndex={1000}>
          <img src="static/logo464.svg" alt="app logo" />
          <Typography variant="h3" gutterBottom align="center">
            PATH.JERRYIO Version {APP_VERSION.version}
          </Typography>
          <Typography variant="body1" align="center" sx={{ marginBottom: "2rem" }}>
            Made by Jerry Lum
          </Typography>
          <Typography variant="body1" align="center">
            This is a free software licensing under GPL-3.0
          </Typography>
          <Typography variant="body1" align="center">
            <a target="_blank" rel="noreferrer" href="https://github.com/Jerrylum/path.jerryio">
              Source Code
            </a>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://www.tldrlegal.com/license/gnu-general-public-license-v3-gpl-3">
              License
            </a>
            <a target="_blank" rel="noreferrer" href="https://github.com/Jerrylum/path.jerryio/blob/main/PRIVACY.md">
              Privacy Terms
            </a>
            <a target="_blank" rel="noreferrer" href="https://www.gnu.org/philosophy/free-sw.html">
              About Free Software
            </a>
            <a target="_blank" rel="noreferrer" href="https://discord.gg/4uVSVXXBBa">
              Join Our Discord Server
            </a>
          </Typography>
        </Card>
      )}
    </Backdrop>
  );
});

export { HelpDialog };
