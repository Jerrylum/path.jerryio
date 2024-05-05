import { Box, Card } from "@mui/material";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { LayoutType } from "@core/Layout";
import { getAppStores } from "@core/MainApp";
import { FieldCanvasElement } from "../common.blocks/field-canvas/FieldCanvasElement";
import { getAllPanelContainers } from "../Layouts";
import { MenuAccordion } from "../common.blocks/panel/MenuAccordion";
import { PanelStaticInstance, PanelAccordionInstance } from "../common.blocks/panel/Panel";
import { PathTreePanel } from "../common.blocks/panel/PathTreePanel";
import { SpeedCanvasElement } from "../common.blocks/speed-canvas/SpeedCanvasElement";
import { MousePositionPresentation } from "../common.blocks/MousePositionPresentation";

export const ClassisLayout = observer(() => {
  const { appPreferences } = getAppStores();

  const containers = getAllPanelContainers(LayoutType.Classic);

  return (
    <>
      <Box id="LeftSection">
        <MenuAccordion />
        <PanelStaticInstance {...PathTreePanel({ layout: LayoutType.Classic })} />
      </Box>

      <Box id="MiddleSection" className={classNames({ "full-height": !appPreferences.isSpeedCanvasVisible })}>
        <Card id="FieldCanvas-Container">
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
        <Box id="RightSection">
          {containers.map(panelContainer => (
            <PanelAccordionInstance key={panelContainer.id} {...panelContainer} />
          ))}
          <MousePositionPresentation />
        </Box>
      )}
    </>
  );
});
