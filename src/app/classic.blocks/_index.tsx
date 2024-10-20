import { Box, Card } from "@mui/material";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { LayoutType } from "@core/Layout";
import { getAppStores } from "@core/MainApp";
import { FieldCanvasElement } from "../common.blocks/field-canvas/FieldCanvasElement";
import { MenuPanel } from "../common.blocks/panel/MenuPanel";
import { PanelStaticInstance, PanelAccordionInstance } from "../common.blocks/panel/Panel";
import { PathTreePanel } from "../common.blocks/panel/PathTreePanel";
import { SpeedCanvasElement } from "../common.blocks/speed-canvas/SpeedCanvasElement";
import { MousePositionPresentation } from "../common.blocks/MousePositionPresentation";

export const ClassisLayout = observer(() => {
  const { appPreferences, ui } = getAppStores();

  const panelProps = ui.getAllPanels().map(obj => obj.builder({}));

  return (
    <>
      <Box id="LeftSection">
        <MenuPanel />
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
          {panelProps.map(panelProp => (
            <PanelAccordionInstance key={panelProp.id} {...panelProp} />
          ))}
          <MousePositionPresentation />
        </Box>
      )}
    </>
  );
});
