import { Card } from "@mui/material";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import React from "react";
import { LayoutType } from "../core/Layout";
import { ControlAccordion } from "./common.blocks/ControlAccordion";
import { FieldCanvasElement } from "./FieldCanvasElement";
import { MenuAccordion } from "./common.blocks/MenuAccordion";
import { PathTreeAccordion } from "./common.blocks/PathTreeAccordion";
import { SpeedCanvasElement } from "./common.blocks/SpeedCanvasElement";
import { getAppStores } from "../core/MainApp";
import { action, makeAutoObservable } from "mobx";
import MenuIcon from "@mui/icons-material/Menu";
import TimelineIcon from "@mui/icons-material/Timeline";
import { Box, Typography } from "@mui/material";
import { MenuMainDropdown } from "./common.blocks/MenuAccordion";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import HomeIcon from "@mui/icons-material/Home";
import { useWindowSize } from "../core/Hook";
import {
  PanelAccordionContainer,
  PanelContainer,
  PanelFloatingContainer,
  PanelStaticContainer
} from "./common.blocks/Panel";
import { GeneralConfigAccordion } from "./GeneralConfigAccordion";
import { PathConfigAccordion } from "./PathAccordion";

export const LayoutContext = React.createContext<LayoutType>(LayoutType.Classic);
export const LayoutProvider = LayoutContext.Provider;

export const TravelDistancePresentation = observer(() => {
  const { app } = getAppStores();

  const interestedPath = app.interestedPath();

  if (app.robot.position.visible && interestedPath !== undefined) {
    const find = app.robot.position.toVector();
    const points = interestedPath.cachedResult.points;

    let distance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p = points[i];
      if (p.x === find.x && p.y === find.y) break;
      distance += p.distance(points[i + 1]);
    }

    const arcLength = interestedPath.cachedResult.arcLength;

    const traveled = {
      distance: distance,
      percentage: arcLength === 0 ? 100 : (distance / arcLength) * 100
    };

    return (
      <Typography>
        Traveled: {traveled.distance.toUser()} ({traveled.percentage.toFixed(2)}%)
      </Typography>
    );
  } else {
    return null;
  }
});

export const getAllPanelContainers = (layout: LayoutType): PanelContainer[] => {
  return [GeneralConfigAccordion({ layout }), ControlAccordion({ layout }), PathConfigAccordion({ layout })];
};

export const ClassisLayout = observer(() => {
  const { appPreferences } = getAppStores();

  const containers = getAllPanelContainers(LayoutType.Classic);

  return (
    <>
      <Box id="left-section">
        <MenuAccordion />
        <PanelStaticContainer {...PathTreeAccordion({ layout: LayoutType.Classic })} />
      </Box>

      <Box id="middle-section" className={classNames({ "full-height": !appPreferences.isSpeedCanvasVisible })}>
        <Card id="field-panel">
          <svg viewBox="0 0 1 1"></svg>
          <FieldCanvasElement />
        </Card>
        {appPreferences.isSpeedCanvasVisible && (
          <Card id="SpeedCanvas-Container">
            <SpeedCanvasElement extended={false} />
          </Card>
        )}
      </Box>
      {appPreferences.isRightSectionVisible && (
        <Box id="right-section">
          {containers.map(panelContainer => (
            <PanelAccordionContainer key={panelContainer.id} {...panelContainer} />
          ))}
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

  const interestedPath = app.interestedPath();

  const expectedWindowWithIfSpeedCanvasIsFloating = 8 + 48 + 8 + 16 + windowSize.y * 0.12 * 6.5 + 16 + 8 + 48 + 8;
  const isSpeedCanvasExtended = windowSize.x < expectedWindowWithIfSpeedCanvasIsFloating;
  const alpha =
    isSpeedCanvasExtended && variables.isOpenPanel("speed-graph") && interestedPath !== undefined
      ? windowSize.y * 0.12 + 8 + 16 + 8
      : 0;

  const containers = getAllPanelContainers(LayoutType.Exclusive);

  const pathTreeAccordion = PathTreeAccordion({ layout: LayoutType.Exclusive });

  return (
    <>
      <Box className="FieldCanvas-Container">
        <FieldCanvasElement />
      </Box>
      <Box className="panel-icon-box" style={{ left: "8px", top: "8px" }}>
        <Box className="panel-icon" onClick={() => variables.togglePanel("menu")}>
          <MenuIcon fontSize="large" />
        </Box>
        <Box className="panel-icon" onClick={() => variables.togglePanel(pathTreeAccordion.id)}>
          {pathTreeAccordion.icon}
        </Box>
      </Box>
      <Box className="panel-icon-box" style={{ right: "8px", top: "8px" }}>
        {/* 
        <Box className="panel-icon" onClick={() => variables.togglePanel("path")}>
          <LinearScaleIcon fontSize="large" />
        </Box> */}
        {containers.map(panelContainer => (
          <Box className="panel-icon" onClick={() => variables.togglePanel(panelContainer.id)}>
            {panelContainer.icon}
          </Box>
        ))}
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
      <Box id="mouse-position-presentation" style={{ left: "8px", bottom: alpha + "px" }}>
        {app.fieldEditor.mousePosInUOL && (
          <Typography>
            X: {app.fieldEditor.mousePosInUOL.x.toUser()}, Y: {app.fieldEditor.mousePosInUOL.y.toUser()}
          </Typography>
        )}
        <TravelDistancePresentation />
      </Box>
      <Box id="left-section">
        <MenuMainDropdown
          anchor={{ top: 8, left: 48 + 8 + 8 }}
          isOpen={variables.isOpenPanel("menu")}
          onClose={variables.closePanel.bind(variables, "menu")}
        />
        {variables.isOpenPanel(pathTreeAccordion.id) && <PanelFloatingContainer {...pathTreeAccordion} />}
      </Box>
      <Box id="right-section">
        {/* 
        {variables.isOpenPanel("path") && <PathConfigFloatingPanel />} */}

        {containers
          .filter(panelContainer => variables.isOpenPanel(panelContainer.id))
          .filter(panelContainer => panelContainer.id !== "speed-graph")
          .map(panelContainer => (
            <PanelFloatingContainer key={panelContainer.id} {...panelContainer} />
          ))}
      </Box>
      {variables.isOpenPanel("speed-graph") && (
        <Box id="SpeedCanvas-Container" className={classNames({ extended: isSpeedCanvasExtended })}>
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

  const containers = getAllPanelContainers(LayoutType.Mobile);

  const pathTreeAccordion = PathTreeAccordion({ layout: LayoutType.Mobile });

  return (
    <>
      <Box>
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
          {variables.isOpenPanel(pathTreeAccordion.id) && <PanelFloatingContainer {...pathTreeAccordion} />}
          {containers
            .filter(panelContainer => variables.isOpenPanel(panelContainer.id))
            .filter(panelContainer => panelContainer.id !== "speed-graph")
            .map(panelContainer => (
              <PanelStaticContainer key={panelContainer.id} {...panelContainer} />
            ))}
          {variables.isOpenPanel("speed-graph") && (
            <Box id="SpeedCanvas-Container">
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
          <Box className="panel-icon" onClick={() => variables.openPanel(pathTreeAccordion.id)}>
            {pathTreeAccordion.icon}
          </Box>
          {containers.map(panelContainer => (
            <Box className="panel-icon" onClick={() => variables.openPanel(panelContainer.id)}>
              {panelContainer.icon}
            </Box>
          ))}
          <Box className="panel-icon" onClick={() => variables.openPanel("speed-graph")}>
            <TimelineIcon fontSize="large" />
          </Box>
        </Box>
      )}
    </>
  );
});
