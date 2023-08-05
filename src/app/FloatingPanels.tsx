import { makeAutoObservable, action } from "mobx";
import { observer } from "mobx-react-lite";

import { getAppStores } from "../core/MainApp";

import MenuIcon from "@mui/icons-material/Menu";
import ViewListIcon from "@mui/icons-material/ViewList";
import TuneIcon from "@mui/icons-material/Tune";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import WidgetsIcon from "@mui/icons-material/Widgets";
import TimelineIcon from "@mui/icons-material/Timeline";
import { Box, Typography } from "@mui/material";
import { GeneralConfigFloatingPanel } from "./GeneralConfigAccordion";
import React from "react";
import { ControlFloatingPanel } from "./ControlAccordion";
import { PathConfigFloatingPanel } from "./PathAccordion";
import { GraphCanvasElement } from "./GraphCanvasElement";
import { PathTreeFloatingPanel } from "./PathTreeAccordion";

class FloatingPanelsVariables {
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

const FloatingPanels = observer((props: {}) => {
  const { app, help, appPreferences, clipboard } = getAppStores();

  const [variables] = React.useState(() => new FloatingPanelsVariables());

  return (
    <>
      <Box id="panel-icon-box" style={{ left: "8px", top: "8px" }}>
        <Box className="panel-icon">
          <MenuIcon fontSize="large" />
        </Box>
        <Box className="panel-icon">
          <ViewListIcon fontSize="large" onClick={() => variables.togglePanel("paths")} />
        </Box>
      </Box>
      <Box id="panel-icon-box" style={{ right: "8px", top: "8px" }}>
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
      <Box id="left-editor-panel">
        {variables.isOpenPanel("paths") && <PathTreeFloatingPanel />}
      </Box>
      <Box id="right-editor-panel">
        {variables.isOpenPanel("general-config") && <GeneralConfigFloatingPanel />}
        {variables.isOpenPanel("control") && <ControlFloatingPanel />}
        {variables.isOpenPanel("path") && <PathConfigFloatingPanel />}
      </Box>
      {variables.isOpenPanel("speed-graph") && (
        <Box id="graph-panel">
          {app.interestedPath() ? <GraphCanvasElement /> : <Typography>(No path to display)</Typography>}
        </Box>
      )}
    </>
  );
});

export { FloatingPanels };
