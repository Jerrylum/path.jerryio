import { observer } from "mobx-react-lite";
import { getAppStores } from "@core/MainApp";
import { Box, BoxProps, Card, Typography } from "@mui/material";
import classNames from "classnames";
import { LayoutType } from "@core/Layout";
import { FieldCanvasElement } from "./field-canvas/FieldCanvasElement";
import { getAllPanelContainers } from "../Layouts";
import { MenuAccordion } from "./panel/MenuAccordion";
import { PanelStaticContainer, PanelAccordionContainer } from "./panel/Panel";
import { PathTreeAccordion } from "./panel/PathTreeAccordion";
import { SpeedCanvasElement } from "./speed-canvas/SpeedCanvasElement";

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
      <Typography variant="body1" color="white">
        Traveled: {traveled.distance.toUser()} ({traveled.percentage.toFixed(2)}%)
      </Typography>
    );
  } else {
    return null;
  }
});

export const MousePositionPresentation = observer((props: BoxProps) => {
  const { app } = getAppStores();

  return (
    <Box id="MousePositionPresentation" {...props}>
      {app.fieldEditor.mousePosInUOL && (
        <Typography variant="body1" color="white">
          X: {app.fieldEditor.mousePosInUOL.x.toUser()}, Y: {app.fieldEditor.mousePosInUOL.y.toUser()}
        </Typography>
      )}
      <TravelDistancePresentation />
    </Box>
  );
});

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
        </Box>
      )}
    </>
  );
});
