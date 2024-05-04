import { observer } from "mobx-react-lite";
import { getAppStores } from "@core/MainApp";
import { Box, BoxProps, Typography } from "@mui/material";

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
