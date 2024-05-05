import { Box, IconButton, Tooltip } from "@mui/material";
import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { AnyControl, Control, EndControl } from "@core/Path";
import { ObserverInput, clampQuantity } from "@app/component.blocks/ObserverInput";
import { Quantity, UnitOfAngle, UnitOfLength } from "@core/Unit";
import { UpdatePathTreeItems } from "@core/Command";
import { getAppStores } from "@core/MainApp";
import { NumberUOA, NumberUOL } from "@token/Tokens";
import { parseFormula } from "@core/Util";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FlipIcon from "@mui/icons-material/Flip";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import RotateRightIcon from "@mui/icons-material/RotateRight";

import "./ControlPanel.scss";
import { PanelInstance, PanelInstanceBuilderProps } from "./Panel";
import { LayoutType } from "@core/Layout";
import { boundHeading, findCentralPoint } from "@src/core/Calculation";
import { Coordinate, CoordinateWithHeading, EuclideanTransformation } from "@src/core/Coordinate";

const ControlPanelBody = observer((props: {}) => {
  const { app } = getAppStores();

  const isDisabled = app.selectedControl === undefined;

  const flipByAxisX = function () {
    const selectedControls = app.selectedEntities.filter(
      entity => entity instanceof EndControl || entity instanceof Control
    ) as AnyControl[];

    if (selectedControls.length === 0) return;

    const updates = selectedControls.map(control => {
      if (control instanceof EndControl) {
        return { y: control.y * -1, heading: boundHeading(90 + (90 - control.heading)) };
      } else {
        return { y: control.y * -1 };
      }
    }) as Partial<AnyControl>[];

    app.history.execute("Flip by Axis X", new UpdatePathTreeItems(selectedControls, updates), 0);
  };

  const flipByAxisY = function () {
    const selectedControls = app.selectedEntities.filter(
      entity => entity instanceof EndControl || entity instanceof Control
    ) as AnyControl[];

    if (selectedControls.length === 0) return;

    const updates = selectedControls.map(control => {
      if (control instanceof EndControl) {
        return { x: control.x * -1, heading: boundHeading(180 + (180 - control.heading)) };
      } else {
        return { x: control.x * -1 };
      }
    }) as Partial<AnyControl>[];

    app.history.execute("Flip by Axis Y", new UpdatePathTreeItems(selectedControls, updates), 0);
  };

  const rotate = function (angle: number) {
    const selectedControls = app.selectedEntities.filter(
      entity => entity instanceof EndControl || entity instanceof Control
    ) as AnyControl[];

    if (selectedControls.length === 0) return;

    const central = findCentralPoint(selectedControls)!;
    const t = new EuclideanTransformation({ ...central, heading: angle });

    const updates = selectedControls.map(control => {
      if (control instanceof EndControl) {
        const { x, y, heading } = t.transform(control) as CoordinateWithHeading;
        return { x: central.x + x, y: central.y + y, heading: heading };
      } else {
        const { x, y } = t.transform(control) as Coordinate;
        return { x: central.x + x, y: central.y + y };
      }
    });

    app.history.execute("Rotate controls right", new UpdatePathTreeItems(selectedControls, updates), 0);
  };

  return (
    <Box id="ControlPanel">
      <Box className="Panel-FlexBox">
        <ObserverInput
          label="X"
          getValue={() => {
            if (app.selectedEntityCount === 0) return "";
            if (app.selectedEntityCount > 1) return "(mixed)";
            const control = app.selectedControl;
            if (control === undefined) return "";
            return control.x.toUser().toString();
          }}
          setValue={(value: string) => {
            if (app.selectedEntityCount !== 1) return;
            const control = app.selectedControl;
            if (control === undefined) return;

            const controlUid = control.uid;
            const finalVal = clampQuantity(
              parseFormula(value, NumberUOL.parse)!.compute(app.gc.uol),
              app.gc.uol,
              new Quantity(-1000, UnitOfLength.Centimeter),
              new Quantity(1000, UnitOfLength.Centimeter)
            );

            app.history.execute(
              `Update control ${controlUid} x value`,
              new UpdatePathTreeItems([control], { x: finalVal })
            );
          }}
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => parseFormula(candidate, NumberUOL.parse) !== null}
          disabled={app.selectedEntityCount !== 1 || app.selectedControl === undefined}
          numeric
        />
        <ObserverInput
          label="Y"
          getValue={() => {
            if (app.selectedEntityCount === 0) return "";
            if (app.selectedEntityCount > 1) return "(mixed)";
            const control = app.selectedControl;
            if (control === undefined) return "";
            return control.y.toUser().toString();
          }}
          setValue={(value: string) => {
            if (app.selectedEntityCount !== 1) return;
            const control = app.selectedControl;
            if (control === undefined) return;

            const controlUid = control.uid;
            const finalVal = clampQuantity(
              parseFormula(value, NumberUOL.parse)!.compute(app.gc.uol),
              app.gc.uol,
              new Quantity(-1000, UnitOfLength.Centimeter),
              new Quantity(1000, UnitOfLength.Centimeter)
            );

            app.history.execute(
              `Update control ${controlUid} y value`,
              new UpdatePathTreeItems([control], { y: finalVal })
            );
          }}
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => parseFormula(candidate, NumberUOL.parse) !== null}
          disabled={app.selectedEntityCount !== 1 || app.selectedControl === undefined}
          numeric
        />
        <ObserverInput
          label="Heading"
          getValue={() => {
            if (app.selectedEntityCount === 0) return "";
            if (app.selectedEntityCount > 1) return "(mixed)";
            const control = app.selectedControl;
            if (!(control instanceof EndControl)) return "";
            return control.heading.toUser().toString();
          }}
          setValue={(value: string) => {
            if (app.selectedEntityCount !== 1) return;
            const control = app.selectedControl;
            if (!(control instanceof EndControl)) return;

            const controlUid = control.uid;
            const finalVal = parseFormula(value, NumberUOA.parse)!.compute(UnitOfAngle.Degree).toUser();

            app.history.execute(
              `Update control ${controlUid} heading value`,
              new UpdatePathTreeItems([control], { heading: finalVal })
            );
          }}
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => parseFormula(candidate, NumberUOA.parse) !== null}
          disabled={app.selectedEntityCount !== 1 || app.selectedControl === undefined}
          sx={{
            visibility: app.selectedEntityCount === 1 && !(app.selectedControl instanceof EndControl) ? "hidden" : ""
          }}
          numeric
        />
      </Box>
      <Box className="Panel-FlexBox" sx={{ marginTop: "8px" }}>
        <Tooltip title="Rotate Right 90°">
          <IconButton
            edge="end"
            size="small"
            className="ControlPanel-ActionButton"
            disabled={isDisabled}
            onClick={action(rotate.bind(undefined, -90))}>
            <RotateRightIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rotate Left 90°">
          <IconButton
            edge="end"
            size="small"
            className="ControlPanel-ActionButton"
            disabled={isDisabled}
            onClick={action(rotate.bind(undefined, 90))}>
            <RotateLeftIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Flip Horizontal">
          <IconButton
            edge="end"
            size="small"
            className="ControlPanel-ActionButton"
            disabled={isDisabled}
            onClick={action(flipByAxisY)}>
            <FlipIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Flip Vertical">
          <IconButton
            edge="end"
            size="small"
            className="ControlPanel-ActionButton"
            disabled={isDisabled}
            onClick={action(flipByAxisX)}>
            <FlipIcon sx={{ transform: "rotate(90deg)" }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
});

export const ControlPanel = (props: PanelInstanceBuilderProps): PanelInstance => {
  return {
    id: "ControlPanel",
    header: "Control",
    children: <ControlPanelBody />,
    icon: <FiberManualRecordIcon fontSize="large" />
  };
};
