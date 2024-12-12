import { makeAutoObservable, action, reaction, runInAction } from "mobx";
import DoneIcon from "@mui/icons-material/Done";
import NavigateNextIcon from "@mui/icons-material/KeyboardArrowRight";
import {
  Button,
  Card,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  MenuItemProps,
  MenuProps,
  PopoverPosition,
  Tooltip,
  Typography
} from "@mui/material";
import { observer } from "mobx-react-lite";

import React, { forwardRef } from "react";
import { IS_MAC_OS, getMacHotKeyString, makeId } from "@core/Util";
import { onDownload, onDownloadAs, onNew, onOpen, onSave, onSaveAs } from "@core/InputOutput";
import { getAppStores } from "@core/MainApp";
import { AppThemeType } from "@app/Theme";
import { RemovePathsAndEndControls } from "@core/Command";
import { checkForUpdates } from "@core/Versioning";
import { Path } from "@core/Path";
import { LayoutContext, LayoutType, getAvailableLayouts } from "@core/Layout";
import { useWindowSize } from "@core/Hook";
import { AboutModalSymbol } from "../modal/AboutModal";
import { WelcomeModalSymbol } from "../modal/WelcomeModal";
import { PreferencesModalSymbol } from "../modal/PreferencesModal";

import "./MenuPanel.scss";

const HotkeyTypography = observer((props: { hotkey: string | undefined }) => {
  const { hotkey } = props;

  if (hotkey === undefined) return null;

  if (IS_MAC_OS === false)
    return <Typography variant="body2" color="text.secondary" children={hotkey.replaceAll("Mod", "Ctrl")} />;

  const temp = getMacHotKeyString(hotkey);

  const elements: React.ReactElement[] = [];
  temp.split("").forEach((char, index) => {
    elements.push(
      <Typography
        key={index}
        variant="body2"
        color="text.secondary"
        width="1em"
        textAlign="center"
        fontFamily="-apple-system,system-ui,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif"
        children={char}
      />
    );
  });

  return <>{elements}</>;
});

class CustomMenuController {
  private isCollapsed_ = false;
  private touchingMenuItem: Symbol | null = null;
  private touchingMode: "focus/open-sub-menu" | "open-sub-menu-with-focus" | null = null;
  public enabled = true;

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
    this.isCollapsed_ = true;
    this.touchingMenuItem = null;
    this.touchingMode = null;
    this.parent?.collapse();
  }

  isTouching(menuItemSymbol: Symbol): false | "focus/open-sub-menu" | "open-sub-menu-with-focus" {
    if (this.touchingMenuItem === menuItemSymbol && this.isCollapsed === false && this.enabled) {
      return this.touchingMode ?? "focus/open-sub-menu";
    } else {
      return false;
    }
  }

  get isCollapsed() {
    return this.isCollapsed_;
  }
}

const CustomMenuControllerContext = React.createContext<CustomMenuController>(new CustomMenuController(null));

interface CustomMenuItemProps extends Omit<MenuItemProps, "disabled"> {
  showLeftIcon: boolean;
  label: string;
  hotkey?: string;
  disabled?: string | boolean;
  children?: React.ReactElement[];
  onClick?: React.MouseEventHandler<HTMLLIElement>;
  MenuProps?: Partial<Omit<MenuProps, "children">>;
}

const CustomMenuItem = observer(
  forwardRef<HTMLLIElement | null, CustomMenuItemProps>(
    (props: CustomMenuItemProps, ref: React.ForwardedRef<HTMLLIElement | null>) => {
      const { showLeftIcon, label, hotkey, disabled, children, onClick, MenuProps, ...MenuItemProps } = props;

      const parentMenuCtr = React.useContext(CustomMenuControllerContext);
      const subMenuController = React.useState(() => new CustomMenuController(parentMenuCtr))[0];
      const menuItemSymbol = React.useState(() => Symbol())[0];
      const dateOfActivation = React.useState(() => Date.now() + 100)[0]; // ALGO: Delay activation to prevent accidental opening of sub menu

      const menuItemRef = React.useRef<HTMLLIElement | null>(null);
      React.useImperativeHandle(ref, () => menuItemRef.current!); // eslint-disable-line @typescript-eslint/no-non-null-assertion

      const menuListRef = React.useRef<HTMLUListElement | null>(null);

      const isDisabled = disabled !== undefined && disabled !== false;
      const showTooltip = disabled !== undefined && typeof disabled !== "boolean" && disabled !== "";

      const hasSubMenu = children !== undefined;
      const isSubMenuOpen = hasSubMenu && parentMenuCtr.isTouching(menuItemSymbol) !== false;

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
          parentMenuCtr.collapse();
          return;
        }

        const isTarget = e.target === menuItemRef.current;

        if (isSubMenuOpen) {
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
          className="Menu-Item"
          disabled={isDisabled}
          ref={menuItemRef}
          onClick={e => {
            if (!(Date.now() > dateOfActivation)) return;
            if (hasSubMenu === false && isDisabled === false) parentMenuCtr.collapse();
            runInAction(() => onClick?.(e));
          }}
          onMouseMove={() =>
            Date.now() > dateOfActivation && parentMenuCtr.touch(menuItemSymbol, "focus/open-sub-menu")
          }
          onKeyDown={handleKeyDown}>
          <DoneIcon className="Menu-ItemDoneIcon" sx={{ visibility: !showLeftIcon ? "hidden" : "" }} />
          <ListItemText sx={{ marginRight: "1rem" }}>{label}</ListItemText>
          <HotkeyTypography hotkey={hotkey} />
          {children && <NavigateNextIcon className="Menu-ItemNextIcon" />}
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
                open={isSubMenuOpen}
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

interface CustomMenuProps extends MenuProps {
  children?: React.ReactElement[];
  onClose?: (event: {}, reason: "backdropClick" | "escapeKeyDown" | "menuItemClick") => void;
}

const CustomMenuRoot = observer((props: CustomMenuProps) => {
  const { open, onClose, ...MenuProps } = props;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rootMenuCtr = React.useMemo(() => new CustomMenuController(null), [open]);

  React.useEffect(() => {
    if (rootMenuCtr.isCollapsed) {
      onClose?.({}, "menuItemClick");
    }
  }, [onClose, rootMenuCtr.isCollapsed]);

  // UX: Disable the root menu immediately when the menu is closed
  // It is used to prevent the user from moving the mouse to open the sub menu again
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(
    action(() => {
      rootMenuCtr.enabled = open;
    }),
    [open, rootMenuCtr]
  );

  return (
    <CustomMenuControllerContext.Provider value={rootMenuCtr}>
      <Menu
        MenuListProps={{ dense: true }}
        disableRestoreFocus={true}
        autoFocus={true}
        disableAutoFocus
        disableEnforceFocus
        open={open && rootMenuCtr.isCollapsed === false}
        onClose={(e, reason) => {
          rootMenuCtr.untouch();
          onClose?.(e, reason);
        }}
        {...MenuProps}
      />
    </CustomMenuControllerContext.Provider>
  );
});

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

const MenuPanel = observer((props: {}) => {
  const [variables] = React.useState(() => new MenuVariables());

  return (
    <Card id="MenuPanel">
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

      <CustomMenuRoot
        anchorEl={document.getElementById("menu-file-btn")}
        open={variables.isOpenMenu("File")}
        onClose={() => variables.closeMenu("File")}>
        {FileMenuItems()}
      </CustomMenuRoot>

      <CustomMenuRoot
        anchorEl={document.getElementById("menu-edit-btn")}
        open={variables.isOpenMenu("Edit")}
        onClose={() => variables.closeMenu("Edit")}>
        {EditMenuItems()}
      </CustomMenuRoot>

      <CustomMenuRoot
        anchorEl={document.getElementById("menu-view-btn")}
        open={variables.isOpenMenu("View")}
        onClose={() => variables.closeMenu("View")}>
        {ViewMenuItems()}
      </CustomMenuRoot>

      <CustomMenuRoot
        anchorEl={document.getElementById("menu-help-btn")}
        open={variables.isOpenMenu("Help")}
        onClose={() => variables.closeMenu("Help")}>
        {HelpMenuItems()}
      </CustomMenuRoot>
    </Card>
  );
});

const MenuMainDropdown = observer((props: { anchor: PopoverPosition; isOpen: boolean; onClose: () => void }) => {
  return (
    <>
      <CustomMenuRoot
        anchorReference="anchorPosition"
        anchorPosition={props.anchor}
        open={props.isOpen}
        onClose={props.onClose}>
        <CustomMenuItem showLeftIcon={false} label="File">
          {FileMenuItems()}
        </CustomMenuItem>
        <CustomMenuItem showLeftIcon={false} label="Edit">
          {EditMenuItems()}
        </CustomMenuItem>
        <CustomMenuItem showLeftIcon={false} label="View">
          {ViewMenuItems()}
        </CustomMenuItem>
        <CustomMenuItem showLeftIcon={false} label="Help">
          {HelpMenuItems()}
        </CustomMenuItem>
      </CustomMenuRoot>
    </>
  );
});

const FileMenuItems = () => {
  const { ui } = getAppStores();
  return [
    <CustomMenuItem key={makeId(10)} showLeftIcon={false} label="New File" hotkey="Mod+P" onClick={() => onNew()} />,
    <Divider key={makeId(10)} />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Open File"
      hotkey="Mod+O"
      onClick={() => onOpen(false, false)}
    />,
    <Divider key={makeId(10)} />,
    <CustomMenuItem key={makeId(10)} showLeftIcon={false} label="Save" hotkey="Mod+S" onClick={() => onSave()} />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Save As"
      hotkey="Shift+Mod+S"
      onClick={() => onSaveAs()}
    />,
    <Divider key={makeId(10)} />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Download"
      hotkey="Mod+D"
      onClick={() => onDownload()}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Download As"
      hotkey="Shift+Mod+D"
      onClick={() => onDownloadAs()}
    />,
    <Divider key={makeId(10)} />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Preferences"
      hotkey="Mod+,"
      onClick={() => ui.openModal(PreferencesModalSymbol)}
    />
  ];
};

const EditMenuItems = () => {
  const { app, clipboard } = getAppStores();
  return [
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Undo"
      hotkey="Mod+Z"
      disabled={app.history.canUndo === false && "Nothing to undo"}
      onClick={() => app.history.undo()}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Redo"
      hotkey="Mod+Y"
      disabled={app.history.redoHistorySize === 0 && "Nothing to redo"}
      onClick={() => app.history.redo()}
    />,
    <Divider key={makeId(10)} />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Cut"
      hotkey="Mod+X"
      disabled={
        (app.selectedEntities.length === 0 && "Select items to copy") ||
        (app.selectedEntities.some(e => e instanceof Path !== app.selectedEntities[0] instanceof Path) &&
          "Copying controls and paths together is not supported")
      }
      onClick={() => clipboard.cut()}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Copy"
      hotkey="Mod+C"
      disabled={
        (app.selectedEntities.length === 0 && "Select items to copy") ||
        (app.selectedEntities.some(e => e instanceof Path !== app.selectedEntities[0] instanceof Path) &&
          "Copying controls and paths together is not supported")
      }
      onClick={() => clipboard.copy()}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Paste"
      hotkey="Mod+V"
      disabled={clipboard.hasData === false && "The clipboard is empty"}
      onClick={() => clipboard.paste(undefined)}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Delete"
      hotkey="Del"
      disabled={app.selectedEntityIds.length === 0 && "Select items to delete"}
      onClick={() => {
        const command = new RemovePathsAndEndControls(app.paths, app.selectedEntityIds);
        app.history.execute(`Remove paths and end controls`, command);
      }}
    />,
    <Divider key={makeId(10)} />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Select All"
      hotkey="Mod+A"
      onClick={() => app.onSelectAll()} //
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Select None"
      hotkey="Esc"
      disabled={app.selectedEntityIds.length === 0 && "Nothing to unselect"}
      onClick={() => app.clearSelected()}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Select Inverse"
      hotkey="Shift+Mod+A"
      onClick={() => app.setSelected(app.allEntities.filter(e => !app.selectedEntities.includes(e)))}
    />
  ];
};

const ViewMenuItems = () => {
  const { app, appPreferences } = getAppStores();

  const windowSize = useWindowSize();
  const currentLayoutType = React.useContext(LayoutContext);

  const availableLayouts = getAvailableLayouts(windowSize);

  return [
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={currentLayoutType === LayoutType.Classic}
      label="Classic Layout"
      disabled={availableLayouts.includes(LayoutType.Classic) === false && "The current window size is too small"}
      onClick={() => (appPreferences.layoutType = LayoutType.Classic)}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={currentLayoutType === LayoutType.Exclusive}
      label="Exclusive Layout"
      disabled={availableLayouts.includes(LayoutType.Exclusive) === false && "The current window size is too small"}
      onClick={() => (appPreferences.layoutType = LayoutType.Exclusive)}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={currentLayoutType === LayoutType.Mobile}
      label="Mobile Layout"
      disabled={availableLayouts.includes(LayoutType.Mobile) === false && "The current window size is too small"}
      onClick={() => (appPreferences.layoutType = LayoutType.Mobile)}
    />,
    <Divider key={makeId(10)} />,
    ...(currentLayoutType === LayoutType.Classic
      ? [
          <CustomMenuItem
            key={makeId(10)}
            showLeftIcon={appPreferences.isSpeedCanvasVisible}
            label="Speed Graph"
            hotkey="Mod+B"
            onClick={() => (appPreferences.isSpeedCanvasVisible = !appPreferences.isSpeedCanvasVisible)}
          />,
          <CustomMenuItem
            key={makeId(10)}
            showLeftIcon={appPreferences.isRightSectionVisible}
            label="Right Panel"
            hotkey="Mod+J"
            onClick={() => (appPreferences.isRightSectionVisible = !appPreferences.isRightSectionVisible)}
          />,
          <Divider key={makeId(10)} />
        ]
      : []),
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Zoom In"
      hotkey="Mod+Add"
      onClick={() => (app.fieldEditor.scale += 0.5)}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Zoom Out"
      hotkey="Mod+Minus"
      onClick={() => (app.fieldEditor.scale -= 0.5)}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Zoom to Fit"
      hotkey="Mod+0"
      onClick={() => app.resetAllEditors()}
    />,
    <Divider key={makeId(10)} />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={appPreferences.themeType === AppThemeType.Dark}
      label="Dark Theme (Default)"
      onClick={() => (appPreferences.themeType = AppThemeType.Dark)}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={appPreferences.themeType === AppThemeType.Light}
      label="Light Theme"
      onClick={() => (appPreferences.themeType = AppThemeType.Light)}
    />
  ];
};

const HelpMenuItems = () => {
  const { ui } = getAppStores();
  return [
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Welcome"
      onClick={() => ui.openModal(WelcomeModalSymbol)}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Wiki Page"
      onClick={() => window.open("https://docs.path.jerryio.com", "_blank")}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="Check for Updates"
      onClick={() => checkForUpdates()}
    />,
    <CustomMenuItem
      key={makeId(10)}
      showLeftIcon={false}
      label="About"
      onClick={() => ui.openModal(AboutModalSymbol)}
    />
  ];
};

export { MenuPanel, MenuMainDropdown };
