import { Card } from "@mui/material";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import React from "react";
import { LayoutType } from "../core/Layout";
import { ControlAccordion } from "./ControlAccordion";
import { FieldCanvasElement } from "./FieldCanvasElement";
import { GeneralConfigAccordion } from "./GeneralConfigAccordion";
import { MenuAccordion } from "./MenuAccordion";
import { PathConfigAccordion } from "./PathAccordion";
import { PathTreeAccordion } from "./PathTreeAccordion";
import { SpeedCanvasElement } from "./SpeedCanvasElement";
import { getAppStores } from "../core/MainApp";
import { action, makeAutoObservable } from "mobx";
import MenuIcon from "@mui/icons-material/Menu";
import ViewListIcon from "@mui/icons-material/ViewList";
import TuneIcon from "@mui/icons-material/Tune";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
// import WidgetsIcon from "@mui/icons-material/Widgets";
import TimelineIcon from "@mui/icons-material/Timeline";
import { Box, Typography } from "@mui/material";
import { GeneralConfigFloatingPanel } from "./GeneralConfigAccordion";
import { ControlFloatingPanel } from "./ControlAccordion";
import { PathConfigFloatingPanel } from "./PathAccordion";
import { PathTreeFloatingPanel } from "./PathTreeAccordion";
import { MenuMainDropdown } from "./MenuAccordion";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import HomeIcon from "@mui/icons-material/Home";
import { useWindowSize } from "../core/Hook";

export const LayoutContext = React.createContext<LayoutType>(LayoutType.Classic);
export const LayoutProvider = LayoutContext.Provider;

export const ClassisLayout = observer(() => {
  const { appPreferences } = getAppStores();

  return (
    <>
      <Box id="left-editor-panel">
        <MenuAccordion />
        <PathTreeAccordion />
      </Box>

      <Box id="middle-panel" className={classNames({ "full-height": !appPreferences.isSpeedCanvasVisible })}>
        <Card id="field-panel">
          <svg viewBox="0 0 1 1"></svg>
          <FieldCanvasElement />
        </Card>
        {appPreferences.isSpeedCanvasVisible && (
          <Card id="speed-panel">
            <SpeedCanvasElement extended={false} />
          </Card>
        )}
      </Box>
      {appPreferences.isRightPanelVisible && (
        <Box id="right-editor-panel">
          <GeneralConfigAccordion />
          <ControlAccordion />
          <PathConfigAccordion />
        </Box>
      )}
    </>
  );
});

class ExclusiveLayoutVariables {
  private panelStates: { [key: string]: boolean } = {};

  isOpenPanel(panel: string): boolean {
    return this.panelStates[panel] ?? false;
  }

  openPanel(panel: string) {
    this.panelStates[panel] = true;
  }

  togglePanel(panel: string) {
    this.panelStates[panel] = !this.isOpenPanel(panel);
  }

  closePanel(panel: string) {
    this.panelStates[panel] = false;
  }

  constructor() {
    makeAutoObservable(this);
  }
}

class MobileLayoutVariables {
  public currentPanel: string | null = null;
  public isMenuOpen: boolean = false;

  isOpenPanel(panel: string): boolean {
    return this.currentPanel === panel;
  }

  openPanel(panel: string) {
    this.currentPanel = panel;
  }

  constructor() {
    makeAutoObservable(this);
  }
}

export const ExclusiveLayout = observer(() => {
  const { app } = getAppStores();

  const [variables] = React.useState(() => new ExclusiveLayoutVariables());

  const windowSize = useWindowSize();

  const expectedWindowWithIfSpeedCanvasIsFloating = 8 + 48 + 8 + 16 + windowSize.y * 0.12 * 6.5 + 16 + 8 + 48 + 8;
  const isSpeedCanvasExtended = windowSize.x < expectedWindowWithIfSpeedCanvasIsFloating;
  const alpha =
    isSpeedCanvasExtended && variables.isOpenPanel("speed-graph") && app.interestedPath() !== undefined
      ? windowSize.y * 0.12 + 8 + 16 + 8
      : 0;

  return (
    <>
      <Box id="exclusive-field">
        <FieldCanvasElement />
      </Box>
      <Box className="panel-icon-box" style={{ left: "8px", top: "8px" }}>
        <Box className="panel-icon" onClick={() => variables.togglePanel("menu")}>
          <MenuIcon fontSize="large" />
        </Box>
        <Box className="panel-icon" onClick={() => variables.togglePanel("paths")}>
          <ViewListIcon fontSize="large" />
        </Box>
      </Box>
      <Box className="panel-icon-box" style={{ right: "8px", top: "8px" }}>
        <Box className="panel-icon" onClick={() => variables.togglePanel("general-config")}>
          <TuneIcon fontSize="large" />
        </Box>
        <Box className="panel-icon" onClick={() => variables.togglePanel("control")}>
          <FiberManualRecordIcon fontSize="large" />
        </Box>
        <Box className="panel-icon" onClick={() => variables.togglePanel("path")}>
          <LinearScaleIcon fontSize="large" />
        </Box>
        {/* <Box className="panel-icon">
          <WidgetsIcon fontSize="large" />
        </Box> */}
        <Box className="panel-icon" onClick={() => variables.togglePanel("speed-graph")}>
          <TimelineIcon fontSize="large" />
        </Box>
      </Box>
      <Box className="panel-icon-box" style={{ right: "8px", bottom: alpha + "px" }}>
        <Box
          className={classNames("panel-icon", { disabled: !app.history.canUndo })}
          onClick={() => app.history.undo()}>
          <UndoIcon fontSize="large" />
        </Box>
        <Box
          className={classNames("panel-icon", { disabled: !app.history.canRedo })}
          onClick={() => app.history.redo()}>
          <RedoIcon fontSize="large" />
        </Box>
        <Box className="panel-icon" onClick={() => app.resetFieldOffsetAndScale()}>
          <HomeIcon fontSize="large" />
        </Box>
      </Box>
      <Box id="left-editor-panel">
        <MenuMainDropdown
          anchor={{ top: 8, left: 48 + 8 + 8 }}
          isOpen={variables.isOpenPanel("menu")}
          onClose={variables.closePanel.bind(variables, "menu")}
        />
        {variables.isOpenPanel("paths") && <PathTreeFloatingPanel />}
      </Box>
      <Box id="right-editor-panel">
        {variables.isOpenPanel("general-config") && <GeneralConfigFloatingPanel />}
        {variables.isOpenPanel("control") && <ControlFloatingPanel />}
        {variables.isOpenPanel("path") && <PathConfigFloatingPanel />}
      </Box>
      {variables.isOpenPanel("speed-graph") && (
        <Box id="speed-panel" className={classNames({ extended: isSpeedCanvasExtended })}>
          {app.interestedPath() ? (
            <SpeedCanvasElement extended={isSpeedCanvasExtended} />
          ) : (
            <Typography>(No path to display)</Typography>
          )}
        </Box>
      )}
    </>
  );
});

export const MobileLayout = observer(() => {
  const { app } = getAppStores();

  const [variables] = React.useState(() => new MobileLayoutVariables());

  return (
    <>
      <Box id="exclusive-field">
        <FieldCanvasElement />
      </Box>
      <Box id="top-nav">
        <Box id="left-div">
          <Box className="panel-icon" onClick={action(() => (variables.isMenuOpen = true))}>
            <MenuIcon fontSize="large" />
          </Box>
        </Box>
        <Box id="undo-redo-div">
          <Box
            className={classNames("panel-icon", { disabled: !app.history.canUndo })}
            onClick={() => app.history.undo()}>
            <UndoIcon fontSize="large" />
          </Box>
          <Box
            className={classNames("panel-icon", { disabled: !app.history.canRedo })}
            onClick={() => app.history.redo()}>
            <RedoIcon fontSize="large" />
          </Box>
          <MenuMainDropdown
            anchor={{ top: 8, left: 48 + 8 + 8 }}
            isOpen={variables.isMenuOpen}
            onClose={action(() => (variables.isMenuOpen = false))}
          />
        </Box>
        <Box id="right-div">
          {variables.currentPanel !== null && (
            <Typography id="done-button" onClick={action(() => (variables.currentPanel = null))}>
              Done
            </Typography>
          )}
        </Box>
      </Box>
      {variables.currentPanel !== null && (
        <Box id="bottom-panel">
          {variables.isOpenPanel("paths") && <PathTreeFloatingPanel />}
          {variables.isOpenPanel("general-config") && <GeneralConfigFloatingPanel />}
          {variables.isOpenPanel("control") && <ControlFloatingPanel />}
          {variables.isOpenPanel("path") && <PathConfigFloatingPanel />}
          {variables.isOpenPanel("speed-graph") && (
            <Box id="speed-panel">
              {app.interestedPath() ? (
                <SpeedCanvasElement extended={true} />
              ) : (
                <Typography sx={{ textAlign: "center" }}>(No path to display)</Typography>
              )}
            </Box>
          )}
        </Box>
      )}
      {variables.currentPanel === null && (
        <Box id="bottom-nav">
          <Box className="panel-icon" onClick={() => variables.openPanel("paths")}>
            <ViewListIcon fontSize="large" />
          </Box>
          <Box className="panel-icon" onClick={() => variables.openPanel("general-config")}>
            <TuneIcon fontSize="large" />
          </Box>
          <Box className="panel-icon" onClick={() => variables.openPanel("control")}>
            <FiberManualRecordIcon fontSize="large" />
          </Box>
          <Box className="panel-icon" onClick={() => variables.openPanel("path")}>
            <LinearScaleIcon fontSize="large" />
          </Box>
          <Box className="panel-icon" onClick={() => variables.openPanel("speed-graph")}>
            <TimelineIcon fontSize="large" />
          </Box>
        </Box>
      )}
    </>
  );
});
