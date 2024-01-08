import { Box, Card } from "@mui/material";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { LayoutType } from "@core/Layout";
import { getAppStores } from "@core/MainApp";
import { FieldCanvasElement } from "../FieldCanvasElement";
import { getAllPanelContainers } from "../Layouts";
import { MenuAccordion } from "../common.blocks/MenuAccordion";
import { PanelStaticContainer, PanelAccordionContainer } from "../common.blocks/Panel";
import { PathTreeAccordion } from "../common.blocks/PathTreeAccordion";
import { SpeedCanvasElement } from "../common.blocks/SpeedCanvasElement";
import { MousePositionPresentation } from "../common.blocks/MousePositionPresentation";

export const ClassisLayout = observer(() => {
  const { appPreferences } = getAppStores();

  const containers = getAllPanelContainers(LayoutType.Classic);

  return (
    <>
      <Box id="LeftSection">
        <MenuAccordion />
        <PanelStaticContainer {...PathTreeAccordion({ layout: LayoutType.Classic })} />
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
            <PanelAccordionContainer key={panelContainer.id} {...panelContainer} />
          ))}
          <MousePositionPresentation />
        </Box>
      )}
    </>
  );
});
