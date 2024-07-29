import { observer } from "mobx-react-lite";
import { getAppStores } from "@core/MainApp";
import { Box, BoxProps, Typography } from "@mui/material";
import { CoordinateSystemTransformation } from "@src/core/CoordinateSystem";

const MousePosition = observer(() => {
  const { app } = getAppStores();

  const coord = app.fieldEditor.mousePosInUOL;
  if (coord === undefined) return undefined;

  const referencedPath = app.interestedPath();
  if (referencedPath === undefined) return undefined;

  const cs = app.coordinateSystem;
  if (cs === undefined) return undefined;

  const fieldDimension = app.fieldDimension;

  const firstControl = referencedPath.segments[0]?.controls[0];
  if (firstControl === undefined) return undefined;

  const cst = new CoordinateSystemTransformation(cs, fieldDimension, firstControl);
  const coordInFCS = cst.transform(coord);

  return (
    <Typography variant="body1" color="white">
      X: {coordInFCS.x.toUser()}, Y: {coordInFCS.y.toUser()}
    </Typography>
  );
});

const TravelDistance = observer(() => {
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
  return (
    <Box id="MousePositionPresentation" {...props}>
      <MousePosition />
      <TravelDistance />
    </Box>
  );
});
