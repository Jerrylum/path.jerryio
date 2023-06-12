import { Backdrop, Card, Typography } from "@mui/material";
import { makeAutoObservable, action } from "mobx"
import { observer } from "mobx-react-lite";
import { useAppStores } from "./MainApp";

export enum HelpPage {
  None,
  WELCOME,
  ABOUT,
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

const HelpBackdrop = observer((props: {}) => {
  const { help } = useAppStores();

  if (!help.isOpen) return null;

  return (
    <Backdrop
      className="help-backdrop"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={true}
      onClick={action(() => help.close())} >
      {
        help.currentPage === HelpPage.WELCOME &&
          <Card className="help-welcome-page" onClick={(e) => e.stopPropagation()}>
            <Typography variant="h6" gutterBottom>Welcome</Typography>
          </Card>
      }
      {
        help.currentPage === HelpPage.ABOUT &&
          <Card className="help-about-page" onClick={(e) => e.stopPropagation()}>
            <Typography variant="h6" gutterBottom>About</Typography>
          </Card>
      }
    </Backdrop>
  )
});

export { HelpBackdrop };
