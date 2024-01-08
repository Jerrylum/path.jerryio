import { action, makeAutoObservable } from "mobx";
import MenuIcon from "@mui/icons-material/Menu";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import TimelineIcon from "@mui/icons-material/Timeline";
import { Box, Typography } from "@mui/material";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import React from "react";
import { LayoutType } from "@core/Layout";
import { getAppStores } from "@core/MainApp";
import { FieldCanvasElement } from "../FieldCanvasElement";
import { getAllPanelContainers } from "../Layouts";
import { MenuMainDropdown } from "../common.blocks/MenuAccordion";
import { PanelFloatingContainer, PanelStaticContainer } from "../common.blocks/Panel";
import { PathTreeAccordion } from "../common.blocks/PathTreeAccordion";
import { SpeedCanvasElement } from "../common.blocks/SpeedCanvasElement";

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
      <Box id="TopNav">
        <Box id="TopNav-LeftSection">
          <Box className="PanelIcon" onClick={action(() => (variables.isMenuOpen = true))}>
            <MenuIcon fontSize="large" />
          </Box>
        </Box>
        <Box id="TopNav-UndoRedoSection">
          <Box
            className={classNames("PanelIcon", { disabled: !app.history.canUndo })}
            onClick={() => app.history.undo()}>
            <UndoIcon fontSize="large" />
          </Box>
          <Box
            className={classNames("PanelIcon", { disabled: !app.history.canRedo })}
            onClick={() => app.history.redo()}>
            <RedoIcon fontSize="large" />
          </Box>
          <MenuMainDropdown
            anchor={{ top: 8, left: 48 + 8 + 8 }}
            isOpen={variables.isMenuOpen}
            onClose={action(() => (variables.isMenuOpen = false))}
          />
        </Box>
        <Box id="TopNav-RightSection">
          {variables.currentPanel !== null && (
            <Typography id="TopNav-RightSectionDoneButton" onClick={action(() => (variables.currentPanel = null))}>
              Done
            </Typography>
          )}
        </Box>
      </Box>
      {variables.currentPanel !== null && (
        <Box id="BottomPanel">
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
        <Box id="BottomNav">
          <Box className="PanelIcon" onClick={() => variables.openPanel(pathTreeAccordion.id)}>
            {pathTreeAccordion.icon}
          </Box>
          {containers.map(panelContainer => (
            <Box className="PanelIcon" onClick={() => variables.openPanel(panelContainer.id)}>
              {panelContainer.icon}
            </Box>
          ))}
          <Box className="PanelIcon" onClick={() => variables.openPanel("speed-graph")}>
            <TimelineIcon fontSize="large" />
          </Box>
        </Box>
      )}
    </>
  );
});
