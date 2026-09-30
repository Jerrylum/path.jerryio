import { makeAutoObservable } from "mobx";
import { Box, Typography } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import MenuIcon from "@mui/icons-material/Menu";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import TimelineIcon from "@mui/icons-material/Timeline";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import React from "react";
import { useWindowSize } from "@core/Hook";
import { LayoutType } from "@core/Layout";
import { getAppStores } from "@core/MainApp";
import { FieldCanvasElement } from "../common.blocks/field-canvas/FieldCanvasElement";
import { MousePositionPresentation } from "../common.blocks/MousePositionPresentation";
import { MenuMainDropdown } from "../common.blocks/panel/MenuPanel";
import { PanelFloatingInstance } from "../common.blocks/panel/Panel";
import { PathTreePanel } from "../common.blocks/panel/PathTreePanel";
import { SpeedCanvasElement } from "../common.blocks/speed-canvas/SpeedCanvasElement";

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

export const ExclusiveLayout = observer(() => {
  const { app, ui } = getAppStores();

  const [variables] = React.useState(() => new ExclusiveLayoutVariables());

  const windowSize = useWindowSize();

  const interestedPath = app.interestedPath();

  const expectedWindowWithIfSpeedCanvasIsFloating = 8 + 48 + 8 + 16 + windowSize.y * 0.12 * 6.5 + 16 + 8 + 48 + 8;
  const isSpeedCanvasExtended = windowSize.x < expectedWindowWithIfSpeedCanvasIsFloating;
  const alpha =
    isSpeedCanvasExtended && variables.isOpenPanel("speed-graph") && interestedPath !== undefined
      ? windowSize.y * 0.12 + 8 + 16 + 8
      : 0;

  const panelProps = ui.getAllPanels().map(obj => obj.builder({}));

  const pathTreeAccordion = PathTreePanel({ layout: LayoutType.Exclusive });

  return (
    <>
      <Box className="FieldCanvas-Container">
        <FieldCanvasElement />
      </Box>
      <Box className="PanelIcon-Box" style={{ left: "8px", top: "8px" }}>
        <Box className="PanelIcon" onClick={() => variables.togglePanel("menu")}>
          <MenuIcon fontSize="large" />
        </Box>
        <Box className="PanelIcon" onClick={() => variables.togglePanel(pathTreeAccordion.id)}>
          {pathTreeAccordion.icon}
        </Box>
      </Box>
      <Box className="PanelIcon-Box" style={{ right: "8px", top: "8px" }}>
        {panelProps.map(panelProp => (
          <Box className="PanelIcon" key={panelProp.id} onClick={() => variables.togglePanel(panelProp.id)}>
            {panelProp.icon}
          </Box>
        ))}
        <Box className="PanelIcon" onClick={() => variables.togglePanel("speed-graph")}>
          <TimelineIcon fontSize="large" />
        </Box>
      </Box>
      <Box className="PanelIcon-Box" style={{ right: "8px", bottom: alpha + "px" }}>
        <Box className={classNames("PanelIcon", { disabled: !app.history.canUndo })} onClick={() => app.history.undo()}>
          <UndoIcon fontSize="large" />
        </Box>
        <Box className={classNames("PanelIcon", { disabled: !app.history.canRedo })} onClick={() => app.history.redo()}>
          <RedoIcon fontSize="large" />
        </Box>
        <Box className="PanelIcon" onClick={() => app.resetFieldOffsetAndScale()}>
          <HomeIcon fontSize="large" />
        </Box>
      </Box>
      <MousePositionPresentation style={{ left: "8px", bottom: alpha + "px" }} />
      <Box id="LeftSection">
        <MenuMainDropdown
          anchor={{ top: 8, left: 48 + 8 + 8 }}
          isOpen={variables.isOpenPanel("menu")}
          onClose={variables.closePanel.bind(variables, "menu")}
        />
        {variables.isOpenPanel(pathTreeAccordion.id) && <PanelFloatingInstance {...pathTreeAccordion} />}
      </Box>
      <Box id="RightSection">
        {panelProps
          .filter(panelProp => variables.isOpenPanel(panelProp.id))
          .filter(panelProp => panelProp.id !== "speed-graph")
          .map(panelProp => (
            <PanelFloatingInstance key={panelProp.id} {...panelProp} />
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
