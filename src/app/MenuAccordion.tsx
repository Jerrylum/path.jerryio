import { makeAutoObservable, action, reaction } from "mobx";
import DoneIcon from "@mui/icons-material/Done";
import NavigateNextIcon from "@mui/icons-material/KeyboardArrowRight";
import {
  Box,
  Button,
  Card,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  MenuItemProps,
  MenuItemTypeMap,
  MenuProps,
  Tooltip,
  Typography
} from "@mui/material";
import { observer } from "mobx-react-lite";

import React, { HTMLAttributes, RefAttributes, forwardRef } from "react";
import { DefaultComponentProps } from "@mui/material/OverridableComponent";
import { IS_MAC_OS } from "../core/Util";
import { onDownload, onDownloadAs, onNew, onOpen, onSave, onSaveAs } from "../core/InputOutput";
import { getAppStores } from "../core/MainApp";
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

class CustomMenuController {
  private isCollapsed = false;
  private touchingMenuItem: Symbol | null = null;
  private touchingMode: "focus/open-sub-menu" | "open-sub-menu-with-focus" | null = null;

  constructor(private parent: CustomMenuController | null) {
    makeAutoObservable(this);

    reaction(
      () => parent?.touchingMenuItem,
      () => {
        this.touchingMenuItem = null;
        this.touchingMode = null;
      }
    );
  }

  touch(menuItemSymbol: Symbol, mode: "focus/open-sub-menu" | "open-sub-menu-with-focus") {
    this.touchingMenuItem = menuItemSymbol;
    this.touchingMode = mode;
  }

  untouch() {
    this.touchingMenuItem = null;
    this.touchingMode = null;
  }

  collapse() {
    this.isCollapsed = true;
    this.touchingMenuItem = null;
    this.touchingMode = null;
    this.parent?.collapse();
  }

  isTouching(menuItemSymbol: Symbol): false | "focus/open-sub-menu" | "open-sub-menu-with-focus" {
    if (this.touchingMenuItem === menuItemSymbol && this.isCollapsed === false) {
      return this.touchingMode ?? "focus/open-sub-menu";
    } else {
      return false;
    }
  }
}

const CustomMenuControllerContext = React.createContext<CustomMenuController>(new CustomMenuController(null));

interface CustomMenuItemProps extends Omit<MenuItemProps, "disabled"> {
  showLeftIcon: boolean;
  label: string;
  hotkey?: string;
  parentMenuOpen?: boolean;
  disabled?: string | boolean;
  // children?: React.ReactElement<CustomMenuItemProps>[];
  children?: React.ReactElement[];
  onClick?: React.MouseEventHandler<HTMLLIElement>;
  MenuProps?: Partial<Omit<MenuProps, "children">>;
}

const CustomMenuItem = observer(
  forwardRef<HTMLLIElement | null, CustomMenuItemProps>(
    (props: CustomMenuItemProps, ref: React.ForwardedRef<HTMLLIElement | null>) => {
      const { showLeftIcon, label, hotkey, parentMenuOpen, disabled, children, onClick, MenuProps, ...MenuItemProps } =
        props;

      const parentMenuCtr = React.useContext(CustomMenuControllerContext);
      const subMenuController = React.useState(() => new CustomMenuController(parentMenuCtr))[0];
      const menuItemSymbol = React.useState(() => Symbol())[0];

      const menuItemRef = React.useRef<HTMLLIElement | null>(null);
      React.useImperativeHandle(ref, () => menuItemRef.current!); // eslint-disable-line @typescript-eslint/no-non-null-assertion

      const menuListRef = React.useRef<HTMLUListElement | null>(null);

      const isDisabled = disabled !== undefined && disabled !== false;
      const showTooltip = disabled !== undefined && typeof disabled !== "boolean" && disabled !== "";

      const hasSubMenu = children !== undefined;
      const isParentOpen = parentMenuOpen ?? true;
      const isSubMenuOpenFinal = hasSubMenu && isParentOpen && parentMenuCtr.isTouching(menuItemSymbol) !== false;

      const isSubMenuFocused = () => {
        if (menuListRef.current === null) return false;

        const menuList = menuListRef.current;

        const active = menuList.ownerDocument.activeElement ?? null;
        for (const child of [...menuList.children]) {
          if (child === active) {
            return true;
          }
        }

        return false;
      };

      const isMenuItemFocused = () => {
        if (menuItemRef.current === null) return false;

        const active = menuItemRef.current.ownerDocument.activeElement ?? null;
        return active === menuItemRef.current;
      };

      const handleKeyDown = (e: React.KeyboardEvent<HTMLLIElement>) => {
        if (e.key === "Escape") {
          return;
        }

        const isTarget = e.target === menuItemRef.current;

        if (isSubMenuOpenFinal) {
          // UX: If sub menu is open, the event should not propagate to the parent menu
          e.stopPropagation();

          if (e.key === "ArrowLeft" && !isTarget && isSubMenuFocused()) {
            menuItemRef.current?.focus();
            parentMenuCtr.untouch();
          } else if (isSubMenuFocused() === false) {
            const firstChild = menuListRef.current?.children[0] as HTMLDivElement;
            firstChild?.focus();
          }

          // UX: ArrowUp and ArrowDown should be handled by the sub menu by MUI
        } else {
          if ((e.key === "ArrowRight" || e.key === "Enter") && isTarget && isMenuItemFocused()) {
            parentMenuCtr.touch(menuItemSymbol, "open-sub-menu-with-focus");
          }
        }
      };

      const body = (
        <MenuItem
          {...MenuItemProps}
          className="menu-item"
          disabled={isDisabled}
          ref={menuItemRef}
          onClick={e => {
            parentMenuCtr.collapse();
            onClick?.(e);
          }}
          onMouseMove={() => parentMenuCtr.touch(menuItemSymbol, "focus/open-sub-menu")}
          onKeyDown={handleKeyDown}>
          <DoneIcon className="menu-item-done" sx={{ visibility: !showLeftIcon ? "hidden" : "" }} />
          <ListItemText sx={{ marginRight: "1rem" }}>{label}</ListItemText>
          <HotkeyTypography hotkey={hotkey} />
          {children && <NavigateNextIcon className="menu-item-next" />}
          {children && (
            // ALGO: The parent of the children should be the menu instead of the Context.Provider
            // in order to make the Mui Menu keyboard navigation work
            <CustomMenuControllerContext.Provider value={subMenuController}>
              <Menu
                // UX: Restore Focus = true
                // Set pointer events to 'none' to prevent the invisible Popover div
                // from capturing events for clicks and hovers
                style={{ pointerEvents: "none" }}
                anchorEl={menuItemRef.current}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ horizontal: "left", vertical: "top" }}
                MenuListProps={{ dense: true, ref: menuListRef, style: { pointerEvents: "auto" } }}
                open={isSubMenuOpenFinal}
                autoFocus={parentMenuCtr.isTouching(menuItemSymbol) === "open-sub-menu-with-focus"}
                disableAutoFocus
                disableEnforceFocus
                onClose={() => parentMenuCtr.untouch()}
                {...MenuProps}>
                {children}
              </Menu>
            </CustomMenuControllerContext.Provider>
          )}
        </MenuItem>
      );

      return showTooltip ? <Tooltip title={disabled} placement="right" children={body} /> : body;
    }
  )
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
  const { app, help, appPreferences, clipboard } = getAppStores();

  const [variables] = React.useState(() => new MenuVariables());

  function onMenuClick(func: () => void) {
    return action(() => {
      func();
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
        disableRestoreFocus={true}
        open={variables.isOpenMenu("File")}
        onClose={() => variables.closeMenu("File")}>
        <CustomMenuItem showLeftIcon={false} label="New File" hotkey="Mod+P" onClick={onMenuClick(() => onNew())} />
        <Divider />
        <CustomMenuItem
          showLeftIcon={false}
          label="Open File"
          hotkey="Mod+O"
          onClick={onMenuClick(() => onOpen(false, false))}
        />
        <Divider />
        <CustomMenuItem showLeftIcon={false} label="Save" hotkey="Mod+S" onClick={onMenuClick(() => onSave())} />
        <CustomMenuItem
          showLeftIcon={false}
          label="Save As"
          hotkey="Shift+Mod+S"
          onClick={onMenuClick(() => onSaveAs())}
        />
        <Divider />
        <CustomMenuItem
          showLeftIcon={false}
          label="Download"
          hotkey="Mod+D"
          onClick={onMenuClick(() => onDownload())}
        />
        <CustomMenuItem
          showLeftIcon={false}
          label="Download As"
          hotkey="Shift+Mod+D"
          onClick={onMenuClick(() => onDownloadAs())}
        />
        <Divider />
        <CustomMenuItem
          showLeftIcon={false}
          label="Preferences"
          hotkey="Mod+,"
          onClick={onMenuClick(() => appPreferences.open())}
        />
      </Menu>

      <Menu
        anchorEl={document.getElementById("menu-edit-btn")}
        MenuListProps={{ dense: true }}
        disableRestoreFocus={true}
        open={variables.isOpenMenu("Edit")}
        onClose={() => variables.closeMenu("Edit")}>
        <CustomMenuItem
          showLeftIcon={false}
          label="Undo"
          hotkey="Mod+Z"
          disabled={app.history.canUndo === false && "Nothing to undo"}
          onClick={onMenuClick(() => app.history.undo())}
        />
        <CustomMenuItem
          showLeftIcon={false}
          label="Redo"
          hotkey="Mod+Y"
          disabled={app.history.redoHistorySize === 0 && "Nothing to redo"}
          onClick={onMenuClick(() => app.history.redo())}
        />
        <Divider />
        <CustomMenuItem
          showLeftIcon={false}
          label="Cut"
          hotkey="Mod+X"
          disabled={
            (app.selectedEntities.length === 0 && "Select items to copy") ||
            (app.selectedEntities.some(e => e instanceof Path !== app.selectedEntities[0] instanceof Path) &&
              "Copying controls and paths together is not supported")
          }
          onClick={onMenuClick(() => clipboard.cut())}
        />
        <CustomMenuItem
          showLeftIcon={false}
          label="Copy"
          hotkey="Mod+C"
          disabled={
            (app.selectedEntities.length === 0 && "Select items to copy") ||
            (app.selectedEntities.some(e => e instanceof Path !== app.selectedEntities[0] instanceof Path) &&
              "Copying controls and paths together is not supported")
          }
          onClick={onMenuClick(() => clipboard.copy())}
        />
        <CustomMenuItem
          showLeftIcon={false}
          label="Paste"
          hotkey="Mod+V"
          disabled={clipboard.hasData === false && "The clipboard is empty"}
          onClick={onMenuClick(() => clipboard.paste(undefined))}
        />
        <CustomMenuItem
          showLeftIcon={false}
          label="Delete"
          hotkey="Del"
          disabled={app.selectedEntityIds.length === 0 && "Select items to delete"}
          onClick={onMenuClick(() => {
            const command = new RemovePathsAndEndControls(app.paths, app.selectedEntityIds);
            app.history.execute(`Remove paths and end controls`, command);
          })}
        />
        <Divider />
        <CustomMenuItem
          showLeftIcon={false}
          label="Select All"
          hotkey="Mod+A"
          onClick={onMenuClick(() => app.onSelectAll())} //
        />
        <CustomMenuItem
          showLeftIcon={false}
          label="Select None"
          hotkey="Esc"
          disabled={app.selectedEntityIds.length === 0 && "Nothing to unselect"}
          onClick={onMenuClick(() => app.clearSelected())}
        />
        <CustomMenuItem
          showLeftIcon={false}
          label="Select Inverse"
          hotkey="Shift+Mod+A"
          onClick={onMenuClick(() => app.setSelected(app.allEntities.filter(e => !app.selectedEntities.includes(e))))}
        />
      </Menu>

      <Menu
        anchorEl={document.getElementById("menu-view-btn")}
        MenuListProps={{ dense: true }}
        disableRestoreFocus={true}
        open={variables.isOpenMenu("View")}
        onClose={() => variables.closeMenu("View")}>
        <CustomMenuItem
          showLeftIcon={app.view.showSpeedCanvas}
          label="Speed Graph"
          hotkey="Mod+B"
          onClick={onMenuClick(() => (app.view.showSpeedCanvas = !app.view.showSpeedCanvas))}
        />
        <CustomMenuItem
          showLeftIcon={app.view.showRightPanel}
          label="Right Panel"
          hotkey="Mod+J"
          onClick={onMenuClick(() => (app.view.showRightPanel = !app.view.showRightPanel))}
        />
        <Divider />
        <CustomMenuItem
          showLeftIcon={false}
          label="Zoom In"
          hotkey="Mod+Add"
          onClick={onMenuClick(() => (app.fieldScale += 0.5))}
        />
        <CustomMenuItem
          showLeftIcon={false}
          label="Zoom Out"
          hotkey="Mod+Minus"
          onClick={onMenuClick(() => (app.fieldScale -= 0.5))}
        />
        <CustomMenuItem
          showLeftIcon={false}
          label="Zoom to Fit"
          hotkey="Mod+0"
          onClick={onMenuClick(() => app.resetFieldDisplay())}
        />
        <Divider />
        <CustomMenuItem
          showLeftIcon={appPreferences.themeType === AppTheme.Dark}
          label="Dark Theme (Default)"
          onClick={onMenuClick(() => (appPreferences.themeType = AppTheme.Dark))}
        />
        <CustomMenuItem
          showLeftIcon={appPreferences.themeType === AppTheme.Light}
          label="Light Theme"
          onClick={onMenuClick(() => (appPreferences.themeType = AppTheme.Light))}
        />
      </Menu>

      <Menu
        anchorEl={document.getElementById("menu-help-btn")}
        MenuListProps={{ dense: true }}
        disableRestoreFocus={true}
        open={variables.isOpenMenu("Help")}
        onClose={() => variables.closeMenu("Help")}>
        <CustomMenuItem showLeftIcon={false} label="Welcome" onClick={onMenuClick(() => help.open(HelpPage.Welcome))} />
        <CustomMenuItem
          showLeftIcon={false}
          label="Wiki Page"
          onClick={onMenuClick(() => window.open("https://github.com/Jerrylum/path.jerryio/wiki", "_blank"))}
        />
        <CustomMenuItem showLeftIcon={false} label="Check for Updates" onClick={onMenuClick(() => checkForUpdates())} />
        <CustomMenuItem showLeftIcon={false} label="About" onClick={onMenuClick(() => help.open(HelpPage.About))} />
      </Menu>
    </Card>
  );
});

const MenuMainDropdown = observer((props: { anchor: HTMLElement; isOpen: boolean; onClose: () => void }) => {
  const { app, help, appPreferences, clipboard } = getAppStores();

  const [variables] = React.useState(() => new MenuVariables());

  return (
    <>
      <Menu
        anchorReference="anchorPosition"
        anchorPosition={{ top: 8, left: 48 + 8 + 8 }}
        MenuListProps={{ dense: true }}
        disableRestoreFocus={true}
        open={props.isOpen}
        autoFocus={false}
        // disableAutoFocus
        disableEnforceFocus
        onClose={props.onClose}>
        <CustomMenuItem showLeftIcon={false} label="File">
          <CustomMenuItem showLeftIcon={false} label="New" />
          <CustomMenuItem showLeftIcon={false} label="New2">
            <CustomMenuItem showLeftIcon={false} label="New3" onClick={e => console.log("hi")} />
            <CustomMenuItem showLeftIcon={false} label="New4" />
          </CustomMenuItem>
        </CustomMenuItem>
        <CustomMenuItem showLeftIcon={false} label="Edit">
          <CustomMenuItem showLeftIcon={false} label="New" />
          <CustomMenuItem showLeftIcon={false} label="New2" />
        </CustomMenuItem>
      </Menu>
    </>
  );
});

export { MenuAccordion, MenuMainDropdown };

