import { action } from "mobx"
import DoneIcon from '@mui/icons-material/Done';
import { Button, Card, Divider, ListItemIcon, ListItemText, Menu, MenuItem, MenuItemTypeMap, MenuList, Typography } from '@mui/material';
import { observer } from "mobx-react-lite";
import { AppProps } from "../App";

import { lightTheme, darkTheme } from "./Theme";
import React from "react";
import { DefaultComponentProps } from "@mui/material/OverridableComponent";
import { useKeyName } from "./Util";
import { onDownload, onNew, onOpen, onSave, onSaveAs } from "../format/Output";
import { MainApp } from "./MainApp";

const CustomMenuItem = observer((props: DefaultComponentProps<MenuItemTypeMap> & {
  done: boolean,
  text: string,
  hotkey?: string,
}) => {
  const { done, text, hotkey, ...rest } = props;

  return (<MenuItem {...rest}>
    <DoneIcon sx={{ visibility: !done ? "hidden" : "" }} />
    <ListItemText sx={{ marginRight: "1rem" }}>{text}</ListItemText>
    <Typography variant="body2" color="text.secondary">{hotkey || ""}</Typography>
  </MenuItem>);
});

const MenuAccordion = observer((props: AppProps) => {

  const [isOpenFileMenu, setIsOpenFileMenu] = React.useState(false);
  const [isOpenEditMenu, setIsOpenEditMenu] = React.useState(false);
  const [isOpenViewMenu, setIsOpenViewMenu] = React.useState(false);
  const [isOpenHelpMenu, setIsOpenHelpMenu] = React.useState(false);

  function onThemeChange() {
    props.app.theme = props.app.theme.palette.mode === lightTheme.palette.mode ? darkTheme : lightTheme;
  }

  function onMenuClick(func: (app: MainApp) => void) {
    return action(() => {
      func(props.app);
      setIsOpenFileMenu(false);
      setIsOpenEditMenu(false);
      setIsOpenViewMenu(false);
      setIsOpenHelpMenu(false);
    });
  }

  return (
    <Card id="main-menu">
      <Button size="small" color="inherit" variant="text" id="menu-file-btn" onClick={() => setIsOpenFileMenu(!isOpenFileMenu)}>File</Button>
      <Button size="small" color="inherit" variant="text" id="menu-edit-btn" onClick={() => setIsOpenEditMenu(!isOpenEditMenu)}>Edit</Button>
      <Button size="small" color="inherit" variant="text" id="menu-view-btn" onClick={() => setIsOpenViewMenu(!isOpenViewMenu)}>View</Button>
      <Button size="small" color="inherit" variant="text" onClick={action(onThemeChange)}>Help</Button>

      <Menu anchorEl={document.getElementById('menu-file-btn')} MenuListProps={{ dense: true }}
        open={isOpenFileMenu} onClose={() => setIsOpenFileMenu(false)}>
        <CustomMenuItem done={false} text="New File" hotkey={useKeyName("Ctrl+N")} onClick={onMenuClick(onNew)} />
        <Divider />
        <CustomMenuItem done={false} text="Open File" hotkey={useKeyName("Ctrl+O")} onClick={onMenuClick(onOpen)} />
        <Divider />
        <CustomMenuItem done={false} text="Save" hotkey={useKeyName("Ctrl+S")} onClick={onMenuClick(onSave)} />
        <CustomMenuItem done={false} text="Save As" hotkey={useKeyName("Ctrl+Shift+S")} onClick={onMenuClick(onSaveAs)} />
        <CustomMenuItem done={false} text="Download" hotkey={useKeyName("Ctrl+D")} onClick={onMenuClick(onDownload)} />
        <Divider />
        <CustomMenuItem done={false} text="Preferences" hotkey={useKeyName("Ctrl+,")} />
      </Menu>

      <Menu anchorEl={document.getElementById('menu-edit-btn')} MenuListProps={{ dense: true }}
        open={isOpenEditMenu} onClose={() => setIsOpenEditMenu(false)}>
        <CustomMenuItem done={false} text="Undo" hotkey={useKeyName("Ctrl+Z")} />
        <CustomMenuItem done={false} text="Redo" hotkey={useKeyName("Ctrl+Y")} />
        <Divider />
        <CustomMenuItem done={false} text="Select all" hotkey={useKeyName("Ctrl+A")} />
        <CustomMenuItem done={false} text="Select none" hotkey="Esc" />
        <CustomMenuItem done={false} text="Select inverse" hotkey={useKeyName("Ctrl+Shift+A")} />
      </Menu>

      <Menu anchorEl={document.getElementById('menu-view-btn')} MenuListProps={{ dense: true }}
        open={isOpenViewMenu} onClose={() => setIsOpenViewMenu(false)}>
        <CustomMenuItem done={props.app.view.showSpeedCanvas} text="Speed Canvas" hotkey={useKeyName("Ctrl+J")}
          onClick={onMenuClick(() => props.app.view.showSpeedCanvas = !props.app.view.showSpeedCanvas)} />
        <CustomMenuItem done={props.app.view.showRightPanel} text="Right Panel" hotkey={useKeyName("Ctrl+B")}
          onClick={onMenuClick(() => props.app.view.showRightPanel = !props.app.view.showRightPanel)} />
        <Divider />
        <CustomMenuItem done={props.app.theme.palette.mode === lightTheme.palette.mode} text="Light Theme (Default)"
          onClick={onMenuClick(() => props.app.theme = lightTheme)} />
        <CustomMenuItem done={props.app.theme.palette.mode === darkTheme.palette.mode} text="Dark Theme"
          onClick={onMenuClick(() => props.app.theme = darkTheme)} />
      </Menu>
    </Card>
  );
});

export { MenuAccordion };