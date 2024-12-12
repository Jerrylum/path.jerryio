import { Box, IconButton, Tooltip } from "@mui/material";
import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { AnyControl, Control, EndControl } from "@core/Path";
import { FormInputField, clampQuantity } from "@app/component.blocks/FormInputField";
import { Quantity, UnitOfAngle, UnitOfLength } from "@core/Unit";
import { boundHeading, findCentralPoint } from "@core/Calculation";
import { Coordinate, CoordinateWithHeading, EuclideanTransformation, isCoordinateWithHeading } from "@core/Coordinate";
import { PanelBuilderProps, PanelInstanceProps } from "@core/Layout";
import { UpdatePathTreeItems } from "@core/Command";
import { getAppStores } from "@core/MainApp";
import { NumberUOA, NumberUOL } from "@token/Tokens";
import { parseFormula } from "@core/Util";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FlipIcon from "@mui/icons-material/Flip";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import RotateRightIcon from "@mui/icons-material/RotateRight";

import "./ControlConfigPanel.scss";
import { PanelBox } from "@src/app/component.blocks/PanelBox";
import { CoordinateSystemTransformation } from "@src/core/CoordinateSystem";

const ControlConfigPanelBody = observer((props: {}) => {
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

  const clampQuantityValue = function (value: number) {
    return clampQuantity(
      value,
      app.gc.uol,
      new Quantity(-1000, UnitOfLength.Centimeter),
      new Quantity(1000, UnitOfLength.Centimeter)
    );
  };

  const cst: CoordinateSystemTransformation | undefined = (() => {
    if (app.selectedEntityCount !== 1) return undefined;
    const control = app.selectedControl;
    if (control === undefined) return undefined;

    const referencedPath = app.interestedPath();
    if (referencedPath === undefined) return undefined;

    const cs = app.coordinateSystem;
    if (cs === undefined) return undefined;

    const fieldDimension = app.fieldDimension;

    const firstControl = referencedPath.segments[0].controls[0];

    return new CoordinateSystemTransformation(cs, fieldDimension, firstControl);
  })();

  let xDisplayValue: string;
  let yDisplayValue: string;
  let headingDisplayValue: string;

  if (app.selectedEntityCount > 1) {
    xDisplayValue = "(mixed)";
    yDisplayValue = "(mixed)";
    headingDisplayValue = "(mixed)";
  } else if (cst === undefined) {
    xDisplayValue = "";
    yDisplayValue = "";
    headingDisplayValue = "";
  } else {
    const control = app.selectedControl!;
    const coordInFCS = cst.transform(control);
    xDisplayValue = coordInFCS.x.toUser().toString();
    yDisplayValue = coordInFCS.y.toUser().toString();
    if (isCoordinateWithHeading(coordInFCS)) {
      headingDisplayValue = coordInFCS.heading.toUser().toString();
    } else {
      headingDisplayValue = "";
    }
  }

  return (
    <Box id="ControlConfigPanel">
      <PanelBox marginTop="0">
        <FormInputField
          label="X"
          getValue={() => xDisplayValue}
          setValue={(value: string) => {
            if (cst === undefined) return;
            const control = app.selectedControl;
            if (control === undefined) return;

            const coordInFCS = cst.transform(control);
            const xValueInFCS = parseFormula(value, NumberUOL.parse)!.compute(app.gc.uol);
            const newCoord = cst.inverseTransform({ ...coordInFCS, x: xValueInFCS });

            newCoord.x = clampQuantityValue(newCoord.x);
            newCoord.y = clampQuantityValue(newCoord.y);

            app.history.execute(
              `Update control ${control.uid} coordinate`,
              new UpdatePathTreeItems([control], newCoord)
            );
          }}
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => parseFormula(candidate, NumberUOL.parse) !== null}
          disabled={app.selectedEntityCount !== 1 || app.selectedControl === undefined}
          numeric
        />
        <FormInputField
          label="Y"
          getValue={() => yDisplayValue}
          setValue={(value: string) => {
            if (cst === undefined) return;
            const control = app.selectedControl;
            if (control === undefined) return;

            const coordInFCS = cst.transform(control);
            const yValueInFCS = parseFormula(value, NumberUOL.parse)!.compute(app.gc.uol);
            const newCoord = cst.inverseTransform({ ...coordInFCS, y: yValueInFCS });

            newCoord.x = clampQuantityValue(newCoord.x);
            newCoord.y = clampQuantityValue(newCoord.y);

            app.history.execute(
              `Update control ${control.uid} coordinate`,
              new UpdatePathTreeItems([control], newCoord)
            );
          }}
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => parseFormula(candidate, NumberUOL.parse) !== null}
          disabled={app.selectedEntityCount !== 1 || app.selectedControl === undefined}
          numeric
        />
        <FormInputField
          label="Heading"
          getValue={() => headingDisplayValue}
          setValue={(value: string) => {
            if (cst === undefined) return;
            const control = app.selectedControl;
            if (!(control instanceof EndControl)) return;

            const coordInFCS = cst.transform(control);
            const headingValueInFCS = parseFormula(value, NumberUOA.parse)!.compute(UnitOfAngle.Degree);
            const newCoord = cst.inverseTransform({ ...coordInFCS, heading: headingValueInFCS });

            const controlUid = control.uid;
            const finalVal = newCoord.heading;

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
      </PanelBox>
      <PanelBox>
        <Tooltip title="Rotate Right 90°">
          <IconButton
            edge="end"
            size="small"
            className="ControlConfigPanel-ActionButton"
            disabled={isDisabled}
            onClick={action(rotate.bind(undefined, -90))}>
            <RotateRightIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rotate Left 90°">
          <IconButton
            edge="end"
            size="small"
            className="ControlConfigPanel-ActionButton"
            disabled={isDisabled}
            onClick={action(rotate.bind(undefined, 90))}>
            <RotateLeftIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Flip Horizontal">
          <IconButton
            edge="end"
            size="small"
            className="ControlConfigPanel-ActionButton"
            disabled={isDisabled}
            onClick={action(flipByAxisY)}>
            <FlipIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Flip Vertical">
          <IconButton
            edge="end"
            size="small"
            className="ControlConfigPanel-ActionButton"
            disabled={isDisabled}
            onClick={action(flipByAxisX)}>
            <FlipIcon sx={{ transform: "rotate(90deg)" }} />
          </IconButton>
        </Tooltip>
      </PanelBox>
    </Box>
  );
});

export const ControlConfigPanel = (props: PanelBuilderProps): PanelInstanceProps => {
  return {
    id: "ControlConfigPanel",
    header: "Control",
    children: <ControlConfigPanelBody />,
    icon: <FiberManualRecordIcon fontSize="large" />
  };
};
