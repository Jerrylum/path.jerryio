import { action } from "mobx"
import { Button, Card } from '@mui/material';
import { observer } from "mobx-react-lite";
import { AppProps } from "../App";

import { lightTheme, darkTheme } from "./Theme";

const MainAccordion = observer((props: AppProps) => {

  function onThemeChange() {
    props.app.theme = props.app.theme.palette.mode === lightTheme.palette.mode ? darkTheme : lightTheme;
  }

  return (
    <Card id="main-menu">
      <Button size="small" color="inherit" variant="text">File</Button>
      <Button size="small" color="inherit" variant="text">Edit</Button>
      <Button size="small" color="inherit" variant="text">View</Button>
      <Button size="small" color="inherit" variant="text" onClick={action(onThemeChange)}>Help</Button>
    </Card>
  );
});

export { MainAccordion };