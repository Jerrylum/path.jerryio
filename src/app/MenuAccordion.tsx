import { action } from "mobx";
import DoneIcon from "@mui/icons-material/Done";
import { Button, Card, Divider, ListItemText, Menu, MenuItem, MenuItemTypeMap, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";

import React from "react";
import { DefaultComponentProps } from "@mui/material/OverridableComponent";
import { useKeyName } from "../core/Util";
import { onDownload, onDownloadAs, onNew, onOpen, onSave, onSaveAs } from "../core/InputOutput";
import { MainApp, useAppStores } from "../core/MainApp";
import { HelpPage } from "./HelpDialog";
import { AppTheme } from "./Theme";
import { RemovePathsAndEndControls } from "../core/Command";
import { checkForUpdates } from "../core/Versioning";

const CustomMenuItem = observer(
  (
    props: DefaultComponentProps<MenuItemTypeMap> & {
      done: boolean;
      text: string;
      hotkey?: string;
    }
  ) => {
    const { done, text, hotkey, ...rest } = props;

    return (
      <MenuItem {...rest} className="menu-item">
        <DoneIcon sx={{ visibility: !done ? "hidden" : "" }} />
        <ListItemText sx={{ marginRight: "1rem" }}>{text}</ListItemText>
        <Typography variant="body2" color="text.secondary">
          {hotkey || ""}
        </Typography>
      </MenuItem>
    );
  }
);

const MenuAccordion = observer((props: {}) => {
  const { app, confirmation, help, appPreferences } = useAppStores();

  const [isOpenFileMenu, setIsOpenFileMenu] = React.useState(false);
  const [isOpenEditMenu, setIsOpenEditMenu] = React.useState(false);
  const [isOpenViewMenu, setIsOpenViewMenu] = React.useState(false);
  const [isOpenHelpMenu, setIsOpenHelpMenu] = React.useState(false);

  function onMenuClick(func: (app: MainApp) => void) {
    return action(() => {
      func(app);
      setIsOpenFileMenu(false);
      setIsOpenEditMenu(false);
      setIsOpenViewMenu(false);
      setIsOpenHelpMenu(false);
    });
  }

  return (
    <Card id="main-menu">
      <Button
        size="small"
        color="inherit"
        variant="text"
        id="menu-file-btn"
        onClick={() => setIsOpenFileMenu(!isOpenFileMenu)}>
        File
      </Button>
      <Button
        size="small"
        color="inherit"
        variant="text"
        id="menu-edit-btn"
        onClick={() => setIsOpenEditMenu(!isOpenEditMenu)}>
        Edit
      </Button>
      <Button
        size="small"
        color="inherit"
        variant="text"
        id="menu-view-btn"
        onClick={() => setIsOpenViewMenu(!isOpenViewMenu)}>
        View
      </Button>
      <Button
        size="small"
        color="inherit"
        variant="text"
        id="menu-help-btn"
        onClick={() => setIsOpenHelpMenu(!isOpenHelpMenu)}>
        Help
      </Button>

      <Menu
        anchorEl={document.getElementById("menu-file-btn")}
        MenuListProps={{ dense: true }}
        open={isOpenFileMenu}
        onClose={() => setIsOpenFileMenu(false)}>
        <CustomMenuItem
          done={false}
          text="New File"
          hotkey={useKeyName("Ctrl+P")}
          onClick={onMenuClick(() => onNew(app, confirmation))}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Open File"
          hotkey={useKeyName("Ctrl+O")}
          onClick={onMenuClick(() => onOpen(app, confirmation, false, false))}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Save"
          hotkey={useKeyName("Ctrl+S")}
          onClick={onMenuClick(() => onSave(app, confirmation))}
        />
        <CustomMenuItem
          done={false}
          text="Save As"
          hotkey={useKeyName("Ctrl+Shift+S")}
          onClick={onMenuClick(() => onSaveAs(app, confirmation))}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Download"
          hotkey={useKeyName("Ctrl+D")}
          onClick={onMenuClick(() => onDownload(app, confirmation))}
        />
        <CustomMenuItem
          done={false}
          text="Download As"
          hotkey={useKeyName("Ctrl+Shift+D")}
          onClick={onMenuClick(() => onDownloadAs(app, confirmation))}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Preferences"
          hotkey={useKeyName("Ctrl+,")}
          onClick={onMenuClick(() => appPreferences.open())}
        />
      </Menu>

      <Menu
        anchorEl={document.getElementById("menu-edit-btn")}
        MenuListProps={{ dense: true }}
        open={isOpenEditMenu}
        onClose={() => setIsOpenEditMenu(false)}>
        <CustomMenuItem
          done={false}
          text="Undo"
          hotkey={useKeyName("Ctrl+Z")}
          onClick={onMenuClick(() => app.history.undo())}
        />
        <CustomMenuItem
          done={false}
          text="Redo"
          hotkey={useKeyName("Ctrl+Y")}
          onClick={onMenuClick(() => app.history.redo())}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Delete"
          hotkey={useKeyName("Del")}
          onClick={onMenuClick(() => {
            const command = new RemovePathsAndEndControls(app.paths, app.selectedEntityIds);
            if (command.hasTargets === false) return;
            app.history.execute(`Remove paths and end controls`, command);
          })}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Select All"
          hotkey={useKeyName("Ctrl+A")}
          onClick={onMenuClick(() => {
            const path = app.selectedPath;
            const all = path !== undefined ? [path, ...path.controls] : app.allEntities;
            app.setSelected(all);
          })}
        />
        <CustomMenuItem done={false} text="Select None" hotkey="Esc" onClick={onMenuClick(() => app.clearSelected())} />
        <CustomMenuItem
          done={false}
          text="Select Inverse"
          hotkey={useKeyName("Ctrl+Shift+A")}
          onClick={onMenuClick(() => {
            const path = app.selectedPath;
            const all = path !== undefined ? [path, ...path.controls] : app.allEntities;
            app.setSelected(all.filter(e => !app.selectedEntities.includes(e)));
          })}
        />
      </Menu>

      <Menu
        anchorEl={document.getElementById("menu-view-btn")}
        MenuListProps={{ dense: true }}
        open={isOpenViewMenu}
        onClose={() => setIsOpenViewMenu(false)}>
        <CustomMenuItem
          done={app.view.showSpeedCanvas}
          text="Speed Graph"
          hotkey={useKeyName("Ctrl+B")}
          onClick={onMenuClick(() => (app.view.showSpeedCanvas = !app.view.showSpeedCanvas))}
        />
        <CustomMenuItem
          done={app.view.showRightPanel}
          text="Right Panel"
          hotkey={useKeyName("Ctrl+J")}
          onClick={onMenuClick(() => (app.view.showRightPanel = !app.view.showRightPanel))}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Zoom In"
          hotkey="Ctrl+Add"
          onClick={onMenuClick(() => (app.fieldScale += 0.5))}
        />
        <CustomMenuItem
          done={false}
          text="Zoom Out"
          hotkey="Ctrl+Minus"
          onClick={onMenuClick(() => (app.fieldScale -= 0.5))}
        />
        <CustomMenuItem
          done={false}
          text="Zoom to Fit"
          hotkey="Ctrl+0"
          onClick={onMenuClick(() => app.resetFieldDisplay())}
        />
        <Divider />
        <CustomMenuItem
          done={appPreferences.themeType === AppTheme.Dark}
          text="Dark Theme (Default)"
          onClick={onMenuClick(() => (appPreferences.themeType = AppTheme.Dark))}
        />
        <CustomMenuItem
          done={appPreferences.themeType === AppTheme.Light}
          text="Light Theme"
          onClick={onMenuClick(() => (appPreferences.themeType = AppTheme.Light))}
        />
      </Menu>

      <Menu
        anchorEl={document.getElementById("menu-help-btn")}
        MenuListProps={{ dense: true }}
        open={isOpenHelpMenu}
        onClose={() => setIsOpenHelpMenu(false)}>
        <CustomMenuItem done={false} text="Welcome" onClick={onMenuClick(() => help.open(HelpPage.Welcome))} />
        <CustomMenuItem
          done={false}
          text="Wiki Page"
          onClick={onMenuClick(() => window.open("https://github.com/Jerrylum/path.jerryio/wiki", "_blank"))}
        />
        <CustomMenuItem done={false} text="Check for Updates" onClick={onMenuClick(() => checkForUpdates())} />
        <CustomMenuItem done={false} text="About" onClick={onMenuClick(() => help.open(HelpPage.About))} />
      </Menu>
    </Card>
  );
});

export { MenuAccordion };
