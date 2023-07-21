import { makeAutoObservable, action } from "mobx";
import DoneIcon from "@mui/icons-material/Done";
import {
  Button,
  Card,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  MenuItemTypeMap,
  Tooltip,
  Typography
} from "@mui/material";
import { observer } from "mobx-react-lite";

import React from "react";
import { DefaultComponentProps } from "@mui/material/OverridableComponent";
import { IS_MAC_OS } from "../core/Util";
import { onDownload, onDownloadAs, onNew, onOpen, onSave, onSaveAs } from "../core/InputOutput";
import { MainApp, useAppStores } from "../core/MainApp";
import { HelpPage } from "./HelpDialog";
import { AppTheme } from "./Theme";
import { RemovePathsAndEndControls } from "../core/Command";
import { checkForUpdates } from "../core/Versioning";
import { Path } from "../core/Path";

const HotkeyTypography = observer((props: { hotkey: string | undefined }) => {
  const { hotkey } = props;

  if (hotkey === undefined) return null;

  if (IS_MAC_OS === false)
    return <Typography variant="body2" color="text.secondary" children={hotkey.replaceAll("Mod", "Ctrl")} />;

  const temp = hotkey
    .replaceAll("Mod", "⌘")
    .replaceAll("Option", "⌥")
    .replaceAll("Ctrl", "⌃")
    .replaceAll("Shift", "⇧")
    .replaceAll("CapsLock", "⇪")
    .replaceAll("ArrowLeft", "←")
    .replaceAll("ArrowRight", "→")
    .replaceAll("ArrowUp", "↑")
    .replaceAll("ArrowDown", "↓")
    .replaceAll("Tab", "⇥")
    .replaceAll("Del", "⌫")
    .replaceAll(" ", "␣")
    .replaceAll("Esc", "") // Hide escape key
    .replaceAll("+", "")
    .replaceAll("Add", "+")
    .replaceAll("Equal", "+")
    .replaceAll("Subtract", "-")
    .replaceAll("Minus", "-");

  const elements: React.ReactElement[] = [];
  temp.split("").forEach((char, index) => {
    elements.push(
      <Typography
        key={index}
        variant="body2"
        color="text.secondary"
        sx={{
          width: "1em",
          textAlign: "center",
          fontFamily: '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'
        }}
        children={char}
      />
    );
  });

  return <>{elements}</>;
});

const CustomMenuItem = observer(
  (
    props: DefaultComponentProps<MenuItemTypeMap> & {
      done: boolean;
      text: string;
      hotkey?: string;
      disable?: string | boolean;
    }
  ) => {
    const { done, text, hotkey, disable, ...rest } = props;

    const body = (
      <MenuItem {...rest} className="menu-item" disabled={disable !== undefined && disable !== false}>
        <DoneIcon sx={{ visibility: !done ? "hidden" : "" }} />
        <ListItemText sx={{ marginRight: "1rem" }}>{text}</ListItemText>
        <HotkeyTypography hotkey={hotkey} />
      </MenuItem>
    );

    return disable !== undefined && typeof disable !== "boolean" && disable !== "" ? (
      <Tooltip title={disable} placement="right" children={body} />
    ) : (
      body
    );
  }
);

class MenuVariables {
  private menuStates: { [key: string]: boolean } = {};

  isOpenMenu(menu: string): boolean {
    return this.menuStates[menu] ?? false;
  }

  openMenu(menu: string) {
    this.menuStates[menu] = true;
  }

  toggleMenu(menu: string) {
    this.menuStates[menu] = !this.isOpenMenu(menu);
  }

  closeMenu(menu: string) {
    this.menuStates[menu] = false;
  }

  closeAllMenus() {
    for (const key in this.menuStates) {
      this.menuStates[key] = false;
    }
  }

  constructor() {
    makeAutoObservable(this);
  }
}

const MenuAccordion = observer((props: {}) => {
  const { app, confirmation, help, appPreferences, clipboard } = useAppStores();

  const [variables] = React.useState(() => new MenuVariables());

  function onMenuClick(func: (app: MainApp) => void) {
    return action(() => {
      func(app);
      variables.closeAllMenus();
    });
  }

  return (
    <Card id="main-menu">
      <Button
        size="small"
        color="inherit"
        variant="text"
        id="menu-file-btn"
        onClick={() => variables.toggleMenu("File")}>
        File
      </Button>
      <Button
        size="small"
        color="inherit"
        variant="text"
        id="menu-edit-btn"
        onClick={() => variables.toggleMenu("Edit")}>
        Edit
      </Button>
      <Button
        size="small"
        color="inherit"
        variant="text"
        id="menu-view-btn"
        onClick={() => variables.toggleMenu("View")}>
        View
      </Button>
      <Button
        size="small"
        color="inherit"
        variant="text"
        id="menu-help-btn"
        onClick={() => variables.toggleMenu("Help")}>
        Help
      </Button>

      <Menu
        anchorEl={document.getElementById("menu-file-btn")}
        MenuListProps={{ dense: true }}
        open={variables.isOpenMenu("File")}
        onClose={() => variables.closeMenu("File")}>
        <CustomMenuItem
          done={false}
          text="New File"
          hotkey="Mod+P"
          onClick={onMenuClick(() => onNew(app, confirmation))}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Open File"
          hotkey="Mod+O"
          onClick={onMenuClick(() => onOpen(app, confirmation, false, false))}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Save"
          hotkey="Mod+S"
          onClick={onMenuClick(() => onSave(app, confirmation))}
        />
        <CustomMenuItem
          done={false}
          text="Save As"
          hotkey="Shift+Mod+S"
          onClick={onMenuClick(() => onSaveAs(app, confirmation))}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Download"
          hotkey="Mod+D"
          onClick={onMenuClick(() => onDownload(app, confirmation))}
        />
        <CustomMenuItem
          done={false}
          text="Download As"
          hotkey="Shift+Mod+D"
          onClick={onMenuClick(() => onDownloadAs(app, confirmation))}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Preferences"
          hotkey="Mod+,"
          onClick={onMenuClick(() => appPreferences.open())}
        />
      </Menu>

      <Menu
        anchorEl={document.getElementById("menu-edit-btn")}
        MenuListProps={{ dense: true }}
        open={variables.isOpenMenu("Edit")}
        onClose={() => variables.closeMenu("Edit")}>
        <CustomMenuItem
          done={false}
          text="Undo"
          hotkey="Mod+Z"
          disable={app.history.canUndo === false && "Nothing to undo"}
          onClick={onMenuClick(() => app.history.undo())}
        />
        <CustomMenuItem
          done={false}
          text="Redo"
          hotkey="Mod+Y"
          disable={app.history.redoHistorySize === 0 && "Nothing to redo"}
          onClick={onMenuClick(() => app.history.redo())}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Cut"
          hotkey="Mod+X"
          disable={
            (app.selectedEntities.length === 0 && "Select items to copy") ||
            (app.selectedEntities.some(e => e instanceof Path !== app.selectedEntities[0] instanceof Path) &&
              "Copying controls and paths together is not supported")
          }
          onClick={onMenuClick(() => clipboard.cut())}
        />
        <CustomMenuItem
          done={false}
          text="Copy"
          hotkey="Mod+C"
          disable={
            (app.selectedEntities.length === 0 && "Select items to copy") ||
            (app.selectedEntities.some(e => e instanceof Path !== app.selectedEntities[0] instanceof Path) &&
              "Copying controls and paths together is not supported")
          }
          onClick={onMenuClick(() => clipboard.copy())}
        />
        <CustomMenuItem
          done={false}
          text="Paste"
          hotkey="Mod+V"
          disable={clipboard.hasData === false && "The clipboard is empty"}
          onClick={onMenuClick(() => clipboard.paste())}
        />
        <CustomMenuItem
          done={false}
          text="Delete"
          hotkey="Del"
          disable={app.selectedEntityIds.length === 0 && "Select items to delete"}
          onClick={onMenuClick(() => {
            const command = new RemovePathsAndEndControls(app.paths, app.selectedEntityIds);
            app.history.execute(`Remove paths and end controls`, command);
          })}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Select All"
          hotkey="Mod+A"
          onClick={onMenuClick(() => {
            const path = app.selectedPath;
            const all = path !== undefined ? [path, ...path.controls] : app.allEntities;
            app.setSelected(all);
          })}
        />
        <CustomMenuItem
          done={false}
          text="Select None"
          hotkey="Esc"
          disable={app.selectedEntityIds.length === 0 && "Nothing to unselect"}
          onClick={onMenuClick(() => app.clearSelected())}
        />
        <CustomMenuItem
          done={false}
          text="Select Inverse"
          hotkey="Shift+Mod+A"
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
        open={variables.isOpenMenu("View")}
        onClose={() => variables.closeMenu("View")}>
        <CustomMenuItem
          done={app.view.showSpeedCanvas}
          text="Speed Graph"
          hotkey="Mod+B"
          onClick={onMenuClick(() => (app.view.showSpeedCanvas = !app.view.showSpeedCanvas))}
        />
        <CustomMenuItem
          done={app.view.showRightPanel}
          text="Right Panel"
          hotkey="Mod+J"
          onClick={onMenuClick(() => (app.view.showRightPanel = !app.view.showRightPanel))}
        />
        <Divider />
        <CustomMenuItem
          done={false}
          text="Zoom In"
          hotkey="Mod+Add"
          onClick={onMenuClick(() => (app.fieldScale += 0.5))}
        />
        <CustomMenuItem
          done={false}
          text="Zoom Out"
          hotkey="Mod+Minus"
          onClick={onMenuClick(() => (app.fieldScale -= 0.5))}
        />
        <CustomMenuItem
          done={false}
          text="Zoom to Fit"
          hotkey="Mod+0"
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
        open={variables.isOpenMenu("Help")}
        onClose={() => variables.closeMenu("Help")}>
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
