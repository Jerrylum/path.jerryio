import { action, makeAutoObservable, reaction } from "mobx";
import { observer } from "mobx-react-lite";
import { EndControl, Path, SegmentVariant, Vector } from "../core/Path";
import Konva from "konva";
import { Circle, Group, Image, Layer, Line, Stage } from "react-konva";
import { SegmentElement } from "./SegmentElement";
import React from "react";
import useImage from "use-image";

import fieldImageUrl from "../static/field2023.png";
import { ControlElement } from "./ControlElement";
import { AreaSelectionElement } from "./AreaSelectionElement";
import { UnitConverter, UnitOfLength } from "../core/Unit";
import { FieldCanvasConverter, getClientXY } from "../core/Canvas";
import { clamp } from "../core/Util";
import { AddPath, AddSegment } from "../core/Command";
import { getAppStores } from "../core/MainApp";
import { RobotElement } from "./RobotElement";
import {
  firstDerivative,
  fromHeadingInDegreeToAngleInRadian,
  toDerivativeHeading,
  toHeading
} from "../core/Calculation";
import ReactDOM from "react-dom";
import { MagnetReference } from "../core/Magnet";
import { useWindowSize } from "../core/Hook";
import { LayoutType } from "./Layout";
import { Box, Tooltip, TooltipProps, Typography, styled, tooltipClasses } from "@mui/material";
import { Instance } from "@popperjs/core";
import { FieldEditor } from "../core/FieldEditor";

const Padding0Tooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    padding: "0",
    marginBottom: "8px !important"
  }
}));

const FieldTooltipContent = observer((props: { fieldEditor: FieldEditor }) => {
  const { fieldEditor } = props;

  if (fieldEditor.tooltipPosition === undefined) return <></>;

  const { app, clipboard } = getAppStores();

  const Label = function (props: { text: string; onClick: () => void }) {
    return (
      <Typography
        variant="body2"
        component="span"
        className="field-canvas-tooltip-label"
        onClick={action(() => {
          props.onClick();
          fieldEditor.tooltipPosition = undefined; // UX: Hide tooltip
        })}>
        {props.text}
      </Typography>
    );
  };

  function onAddCurve() {
    if (fieldEditor.tooltipPosition === undefined) return;

    const posInPx = fieldEditor.fcc.getUnboundedPx(fieldEditor.tooltipPosition);
    if (posInPx === undefined) return;

    const cpInUOL = fieldEditor.fcc.toUOL(new EndControl(posInPx.x, posInPx.y, 0));

    // UX: Set target path to "interested path"
    let targetPath: Path | undefined = app.interestedPath();
    if (targetPath === undefined) {
      // UX: Create empty new path if: no path exists
      targetPath = app.format.createPath();
      app.history.execute(`Add path ${targetPath.uid}`, new AddPath(app.paths, targetPath));
    }

    if (targetPath.visible && !targetPath.lock) {
      // UX: Add control point if: path is selected and visible and not locked
      app.history.execute(
        `Add curve segment with end control point ${cpInUOL.uid} to path ${targetPath.uid}`,
        new AddSegment(targetPath, cpInUOL, SegmentVariant.CUBIC)
      );
    }
  }

  function onAddLine() {
    if (fieldEditor.tooltipPosition === undefined) return;

    const posInPx = fieldEditor.fcc.getUnboundedPx(fieldEditor.tooltipPosition);
    if (posInPx === undefined) return;

    const cpInUOL = fieldEditor.fcc.toUOL(new EndControl(posInPx.x, posInPx.y, 0));

    // UX: Set target path to "interested path"
    let targetPath: Path | undefined = app.interestedPath();
    if (targetPath === undefined) {
      // UX: Create empty new path if: no path exists
      targetPath = app.format.createPath();
      app.history.execute(`Add path ${targetPath.uid}`, new AddPath(app.paths, targetPath));
    }

    if (targetPath.visible && !targetPath.lock) {
      // UX: Add control point if: path is selected and visible and not locked
      app.history.execute(
        `Add linear segment with end control point ${cpInUOL.uid} to path ${targetPath.uid}`,
        new AddSegment(targetPath, cpInUOL, SegmentVariant.LINEAR)
      );
    }
  }

  function onPaste() {
    clipboard.paste(undefined);
  }

  return (
    <Box>
      <Label text="Curve" onClick={onAddCurve} />
      <Label text="Line" onClick={onAddLine} />
      {clipboard.hasData && <Label text="Paste" onClick={onPaste} />}
      <Label text="Select" onClick={() => {}} />
    </Box>
  );
});

const MagnetReferenceLine = observer((props: { magnetRef: MagnetReference | undefined; fcc: FieldCanvasConverter }) => {
  const { magnetRef, fcc } = props;
  if (magnetRef === undefined) return null;

  const { source, heading } = magnetRef;

  const theta = fromHeadingInDegreeToAngleInRadian(heading);

  const center = fcc.toPx(source);
  const distance =
    Math.sqrt(fcc.pixelWidth ** 2 + fcc.pixelHeight ** 2) + source.distance(new Vector(0, 0)) * fcc.uol2pixel;
  const start: Vector = center.add(new Vector(-distance * Math.cos(theta), distance * Math.sin(theta)));
  const end: Vector = center.add(new Vector(distance * Math.cos(theta), -distance * Math.sin(theta)));

  const lineWidth = 1;

  return <Line points={[start.x, start.y, end.x, end.y]} stroke="red" strokeWidth={lineWidth} />;
});

const PathPoints = observer((props: { path: Path; fcc: FieldCanvasConverter }) => {
  const { path, fcc } = props;

  const pc = path.pc;
  const speedFrom = pc.speedLimit.from;
  const speedTo = pc.speedLimit.to;
  const pointRadius = fcc.pixelHeight / 320;

  // ALGO: This is a separate component because it is expensive to render.

  return (
    <>
      {path.cachedResult.points.map((pointInUOL, index) => {
        const pointInPx = fcc.toPx(pointInUOL);
        const percentage = (pointInUOL.speed - speedFrom) / (speedTo - speedFrom || 1);
        // h => hue, s => saturation, l => lightness
        const color = `hsl(${clamp(percentage * 90, -20, 120)}, 70%, 50%)`; // red = min speed, green = max speed
        return <Circle key={index} x={pointInPx.x} y={pointInPx.y} radius={pointRadius} fill={color} />;
      })}
    </>
  );
});

const PathSegments = observer((props: { path: Path; fcc: FieldCanvasConverter }) => {
  const { path, fcc } = props;

  return (
    <>
      {path.segments.map(
        segment => segment.isVisible() && <SegmentElement key={segment.uid} {...{ segment, path, fcc }} />
      )}
    </>
  );
});

const PathControls = observer((props: { path: Path; fcc: FieldCanvasConverter; isGrabAndMove: boolean }) => {
  const { path, fcc, isGrabAndMove } = props;

  return (
    <>
      {path.segments.map(segment =>
        segment.controls.map((cp, cpIdx) => {
          const isFirstSegment = path.segments[0] === segment;
          if (isFirstSegment === false && cpIdx === 0) return null;
          return cp.visible && <ControlElement key={cp.uid} {...{ segment, path, fcc, cp, isGrabAndMove }} />;
        })
      )}
    </>
  );
});

enum TouchAction {
  Start,
  PendingSelection,
  PanningAndScaling,
  Selection,
  Release,
  End
}

class TouchInteractiveHandler {
  touchAction: TouchAction = TouchAction.Start;
  touchesLastPosition: { [identifier: number]: Vector } = {};
  touchesVector: { [identifier: number]: Vector } = {};

  startSelectionTimer: NodeJS.Timer | undefined = undefined;
  initialTime: number = 0;
  initialFieldScale: number = 0;
  initialPosition: Vector = new Vector(0, 0);
  initialDistanceBetweenTwoTouches: number = 0;
  lastEvent: Konva.KonvaEventObject<TouchEvent> | undefined = undefined;

  constructor() {
    makeAutoObservable(this);

    reaction(
      () => this.touchAction,
      () => this.interact()
    );
  }

  private toVector(t: Touch) {
    return new Vector(t.clientX, t.clientY);
  }

  onTouchStart(event: Konva.KonvaEventObject<TouchEvent>) {
    const evt = event.evt;

    [...evt.touches].forEach(t => {
      const pos = this.toVector(t);
      const lastPos = this.touchesLastPosition[t.identifier] ?? pos;
      this.touchesVector[t.identifier] = pos.subtract(lastPos);
      this.touchesLastPosition[t.identifier] = pos;
    });

    const keys = this.keys;

    if (evt.touches.length === 1) {
      this.initialTime = Date.now();
      this.initialPosition = this.pos(keys[0]);
    } else if (evt.touches.length >= 2) {
      const touch1 = this.pos(keys[0]);
      const touch2 = this.pos(keys[1]);
      const distance = touch1.distance(touch2);
      this.initialPosition = touch1.add(touch2).divide(2);
      this.initialDistanceBetweenTwoTouches = Math.max(distance, 0.1); // 0.1 pixel is the minimum distance
    }

    this.interactWithEvent(event);
  }

  onTouchMove(event: Konva.KonvaEventObject<TouchEvent>) {
    const evt = event.evt;

    [...evt.touches].forEach(t => {
      const pos = this.toVector(t);
      const lastPos = this.touchesLastPosition[t.identifier] ?? pos;
      this.touchesVector[t.identifier] = pos.subtract(lastPos);
      this.touchesLastPosition[t.identifier] = pos;
    });

    this.interactWithEvent(event);
  }

  onTouchEnd(event: Konva.KonvaEventObject<TouchEvent>) {
    const evt = event.evt;

    [...evt.changedTouches].forEach(t => {
      delete this.touchesVector[t.identifier];
      delete this.touchesLastPosition[t.identifier];
    });

    if (evt.touches.length === 0) {
      // TODO
      this.touchesVector = {};
      this.touchesLastPosition = {};
    }

    this.interactWithEvent(event);
  }

  interact() {
    const { app } = getAppStores();

    const keys = this.keys;
    if (this.touchAction === TouchAction.Start) {
      app.fieldEditor.isPendingShowTooltip =
        app.fieldEditor.areaSelection === undefined &&
        app.fieldEditor.tooltipPosition === undefined;
      app.fieldEditor.endAreaSelection();
      app.fieldEditor.tooltipPosition = undefined;

      if (keys.length >= 1) {
        this.touchAction = TouchAction.PendingSelection;

        this.startSelectionTimer = setTimeout(
          action(() => {
            if (this.touchAction !== TouchAction.PendingSelection) return;

            app.setSelected([]);

            const posInPx = app.fieldEditor.fcc.getUnboundedPxFromEvent(this.lastEvent!);
            if (posInPx === undefined) return;

            app.fieldEditor.startAreaSelection(posInPx);
            this.touchAction = TouchAction.Selection;
          }),
          600
        ); // Magic number
      } else {
        this.touchAction = TouchAction.Start;
      }
    } else if (this.touchAction === TouchAction.PendingSelection) {
      if (keys.length >= 1) {
        const t = this.pos(keys[0]);
        if (t.distance(this.initialPosition) > 96 * 0.25) {
          // 1/4 inch, magic number
          this.initialFieldScale = app.fieldEditor.scale;
          app.fieldEditor.offsetStart = t; // ALGO: The value doesn't matter
          this.touchAction = TouchAction.PanningAndScaling;
        }
      } else {
        this.touchAction = TouchAction.Release;
      }
    } else if (this.touchAction === TouchAction.PanningAndScaling) {
      if (keys.length === 1) {
        app.fieldEditor.doPanningWithVector(this.touchesVector[this.keys[0]].divide(app.fieldEditor.scale));
      } else if (keys.length >= 2) {
        const t1 = this.pos(keys[0]);
        const t2 = this.pos(keys[1]);
        const scale = this.initialFieldScale * (t1.distance(t2) / this.initialDistanceBetweenTwoTouches);
        const middlePos = t1.add(t2).divide(2);
        app.fieldEditor.doScaleField(scale, middlePos);

        const vecPos = this.vec(keys[0]).add(this.vec(keys[1])).divide(2);
        app.fieldEditor.doPanningWithVector(vecPos.divide(app.fieldEditor.scale));
      } else {
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.Selection) {
      if (keys.length >= 1) {
        const posInPx = app.fieldEditor.fcc.getUnboundedPxFromEvent(this.lastEvent!);
        if (posInPx === undefined) return;

        app.fieldEditor.updateAreaSelection(posInPx);
      } else {
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.Release) {
      if (Date.now() - this.initialTime < 600) {
        // this.pos(keys[0]) is undefined, use last event
        if (app.fieldEditor.isPendingShowTooltip) {
          app.fieldEditor.tooltipPosition = getClientXY(this.lastEvent!.evt);
        }
      }
      this.touchAction = TouchAction.End;
    } else if (this.touchAction === TouchAction.End) {
      if (keys.length === 0) {
        app.fieldEditor.endAreaSelection();
        app.fieldEditor.offsetStart = undefined;

        // ALGO: Cancel selection if the user lifts the finger
        clearTimeout(this.startSelectionTimer);
        this.startSelectionTimer = undefined;
      } else {
        this.touchAction = TouchAction.Start;
      }
    }
  }

  interactWithEvent(event: Konva.KonvaEventObject<TouchEvent>) {
    this.lastEvent = event;
    this.interact();
  }

  get keys() {
    return Object.keys(this.touchesVector).map(k => parseInt(k));
  }

  pos(key: number) {
    return this.touchesLastPosition[key];
  }

  vec(key: number) {
    return this.touchesVector[key];
  }
}

const FieldCanvasElement = observer((props: {}) => {
  const { app, appPreferences } = getAppStores();

  const windowSize = useWindowSize(
    action((newSize: Vector, oldSize: Vector) => {
      const ratio = (newSize.y + oldSize.y) / 2 / oldSize.y;
      app.fieldEditor.offset = app.fieldEditor.offset.multiply(ratio);

      // UX: Hide tooltip when the window size changes
      fieldEditor.tooltipPosition = undefined;
    })
  );

  const popperRef = React.useRef<Instance>(null);
  const stageBoxRef = React.useRef<HTMLDivElement>(null);

  const uc = new UnitConverter(UnitOfLength.Millimeter, app.gc.uol);
  const isExclusiveLayout = appPreferences.layoutType === LayoutType.EXCLUSIVE;

  const canvasHeightInPx = windowSize.y * (isExclusiveLayout ? 1 : app.view.showSpeedCanvas ? 0.78 : 0.94);
  const canvasWidthInPx = isExclusiveLayout ? windowSize.x : canvasHeightInPx;
  const canvasSizeInUOL = uc.fromAtoB(3683); // 3683 = 145*2.54*10 ~= 3676.528, the size of the field perimeter in Fusion 360

  const [fieldImage] = useImage(fieldImageUrl);

  const offset = app.fieldEditor.offset;
  const scale = app.fieldEditor.scale;

  const fcc = new FieldCanvasConverter(
    canvasWidthInPx,
    canvasHeightInPx,
    canvasSizeInUOL,
    canvasSizeInUOL,
    offset,
    scale,
    stageBoxRef.current
  );

  app.fieldEditor.fcc = fcc;
  const fieldEditor = app.fieldEditor;
  const tiHandler = React.useState(new TouchInteractiveHandler())[0];

  function onTouchStartStage(event: Konva.KonvaEventObject<TouchEvent>) {
    const evt = event.evt;

    evt.preventDefault();

    tiHandler.onTouchStart(event);
  }

  function onTouchMoveStage(event: Konva.KonvaEventObject<TouchEvent>) {
    const evt = event.evt;

    evt.preventDefault();

    tiHandler.onTouchMove(event);
  }

  function onTouchEndStage(event: Konva.KonvaEventObject<TouchEvent>) {
    tiHandler.onTouchEnd(event);
  }

  function onWheelStage(event: Konva.KonvaEventObject<WheelEvent>) {
    const evt = event.evt;

    if (
      evt.ctrlKey === false &&
      (evt.deltaX !== 0 || evt.deltaY !== 0) &&
      fieldEditor.offsetStart === undefined &&
      app.wheelControl("panning")
    ) {
      // UX: Panning if: ctrl key up + wheel/mouse pad + no "Grab & Move" + not changing heading value with scroll wheel in the last 300ms

      evt.preventDefault();

      const newOffset = app.fieldEditor.offset.add(new Vector(evt.deltaX * 0.5, evt.deltaY * 0.5).divide(app.fieldEditor.scale));
      newOffset.x = clamp(
        newOffset.x,
        -canvasWidthInPx * 0.9 + fcc.viewOffset.x,
        canvasWidthInPx * 0.9 - fcc.viewOffset.x
      );
      newOffset.y = clamp(newOffset.y, -canvasHeightInPx * 0.9, canvasHeightInPx * 0.9);
      app.fieldEditor.offset = newOffset;
    } else if (evt.ctrlKey === true && evt.deltaY !== 0) {
      // UX: Zoom in/out if: wheel while ctrl key down

      evt.preventDefault();

      const pos = fcc.getUnboundedPxFromEvent(event, false, false);
      if (pos === undefined) return;

      fieldEditor.doScaleField(scale * (1 - evt.deltaY / 1000), pos);
    }
  }

  function onMouseDownStage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    if ((evt.button === 0 || evt.button === 2) && event.target instanceof Konva.Image) {
      // UX: A flag to indicate that the user is adding a control, this will set to false if mouse is moved
      // UX: onClickFieldImage will check this state, control can only be added inside the field image because of this
      fieldEditor.isAddingControl = true;
    }

    if (
      evt.button === 0 &&
      fieldEditor.offsetStart === undefined &&
      (event.target instanceof Konva.Stage || event.target instanceof Konva.Image)
    ) {
      // left click
      // UX: Only start selection if: left click on the canvas or field image
      // UX: Do not start selection if it is in "Grab & Move"

      if (evt.shiftKey === false) {
        // UX: Clear selection if: left click without shift
        app.clearSelected();
      }

      // UX: selectedBefore is empty if: left click without shift
      const posInPx = fcc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;
      app.fieldEditor.startAreaSelection(posInPx);
    } else if (evt.button === 1 && fieldEditor.areaSelection === undefined) {
      // middle click
      // UX: Start "Grab & Move" if: middle click at any position
      evt.preventDefault(); // UX: Prevent default action (scrolling)

      const posInPx = fcc.getUnboundedPxFromEvent(event, false);
      if (posInPx === undefined) return;

      fieldEditor.offsetStart = posInPx.add(offset);
    } else if (evt.button === 1 && fieldEditor.areaSelection !== undefined) {
      // middle click
      // UX: Do not start "Grab & Move" if it is in area selection, but still prevent default
      evt.preventDefault(); // UX: Prevent default action (scrolling)
    }
  }

  function onMouseMoveOrDragStage(event: Konva.KonvaEventObject<DragEvent | MouseEvent | TouchEvent>) {
    /*
    UX:
    Both mouse move and drag events will trigger this function. it allows users to perform area selection and 
    "Grab & Move" outside the canvas. Both events are needed to maximize usability.

    Normally, both events will be triggered at the same time. (but I don't know why onDragMove returns MouseEvent)
    After the mouse is dragged outside the canvas, only drag event will be triggered. Also, the dragging state will 
    come to an end when any mouse button is down. When it is happened only mouse move event will be triggered.
    */

    // UX: It is not actually dragged "stage", reset the position to (0, 0)
    if (event.target instanceof Konva.Stage) event.target.setPosition(new Vector(0, 0));

    if (event.evt instanceof TouchEvent) {
      tiHandler.onTouchMove(event as Konva.KonvaEventObject<TouchEvent>);
    } else {
      fieldEditor.isAddingControl = false;

      const posInPx = fcc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;
      const posWithOffsetInPx = fcc.getUnboundedPxFromEvent(event, false);
      if (posWithOffsetInPx === undefined) return;

      fieldEditor.updateAreaSelection(posInPx) ||
        fieldEditor.doPanning(posWithOffsetInPx) ||
        fieldEditor.doShowRobot(posInPx);
    }
  }

  function onMouseUpStage(event: Konva.KonvaEventObject<MouseEvent>) {
    // UX: This event is triggered only if the mouse is up inside the canvas.
    // UX: Only reset selection or "Grab & Move" if: left click or middle click released respectively

    if (event.evt.button === 0) {
      // left click
      fieldEditor.endAreaSelection();
    } else if (event.evt.button === 1) {
      // middle click
      fieldEditor.offsetStart = undefined;
    }

    app.magnet = [];
  }

  function onDragEndStage(event: Konva.KonvaEventObject<DragEvent | TouchEvent>) {
    /*
    UX:
    If the mouse is down(any buttons), the drag end event is triggered.
    After that, without dragging, we lose the information of the mouse position outside the canvas.
    We reset everything if the mouse is down outside the canvas.
    */

    // UX: No need to call touchend event handler here

    const rect = event.target.getStage()?.container().getBoundingClientRect();
    if (rect === undefined) return;

    if (event.evt === undefined) return; // XXX: Drag end event from segment control

    const { x: clientX, y: clientY } = getClientXY(event.evt);

    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      fieldEditor.endAreaSelection();
      fieldEditor.offsetStart = undefined;
      app.magnet = [];
    }
  }

  function onClickFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Add control point if: left click or right click without moving the mouse
    if (!(fieldEditor.isAddingControl && (evt.button === 0 || evt.button === 2))) return;

    fieldEditor.isAddingControl = false;

    const posInPx = fcc.getUnboundedPxFromEvent(event);
    if (posInPx === undefined) return;

    const cpInUOL = fcc.toUOL(new EndControl(posInPx.x, posInPx.y, 0));

    // UX: Set target path to "interested path"
    let targetPath: Path | undefined = app.interestedPath();
    if (targetPath === undefined) {
      // UX: Create empty new path if: no path exists
      targetPath = app.format.createPath();
      app.history.execute(`Add path ${targetPath.uid}`, new AddPath(app.paths, targetPath));
    }
    if (targetPath.visible && !targetPath.lock) {
      // UX: Add control point if: path is selected and visible and not locked
      if (evt.button === 0) {
        // UX: Add 4-controls curve if: left click
        app.history.execute(
          `Add curve segment with end control point ${cpInUOL.uid} to path ${targetPath.uid}`,
          new AddSegment(targetPath, cpInUOL, SegmentVariant.CUBIC)
        );
      } else if (evt.button === 2) {
        // UX: Add straight line if: right click
        app.history.execute(
          `Add linear segment with end control point ${cpInUOL.uid} to path ${targetPath.uid}`,
          new AddSegment(targetPath, cpInUOL, SegmentVariant.LINEAR)
        );
      }
    }

    // UX: Select the new control point
    app.setSelected([cpInUOL]);
    // UX: Expand the path to show the new control point
    app.addExpanded(targetPath);
  }

  const visiblePaths = app.paths.filter(path => path.visible);

  return (
    <Padding0Tooltip
      title={<FieldTooltipContent fieldEditor={fieldEditor} />}
      placement="top"
      arrow
      open={fieldEditor.tooltipPosition !== undefined}
      disableFocusListener
      disableHoverListener
      disableTouchListener
      PopperProps={{
        disablePortal: true,
        popperRef,
        anchorEl: {
          getBoundingClientRect: () => {
            const div = stageBoxRef.current;
            if (div === null || fieldEditor.tooltipPosition === undefined) return new DOMRect(0, 0, 0, 0);

            return new DOMRect(fieldEditor.tooltipPosition.x, fieldEditor.tooltipPosition.y, 0, 0);
          }
        }
      }}>
      <Box ref={stageBoxRef}>
        <Stage
          className="field-canvas"
          width={fcc.pixelWidth}
          height={fcc.pixelHeight}
          scale={new Vector(scale, scale)}
          offset={offset.subtract(fcc.viewOffset)}
          draggable
          style={{ cursor: fieldEditor.offsetStart ? "grab" : "" }}
          onTouchStart={action(onTouchStartStage)}
          onTouchMove={action(onTouchMoveStage)}
          onTouchEnd={action(onTouchEndStage)}
          onContextMenu={e => e.evt.preventDefault()}
          onWheel={action(onWheelStage)}
          onMouseDown={action(onMouseDownStage)}
          onMouseMove={action(onMouseMoveOrDragStage)}
          onMouseUp={action(onMouseUpStage)}
          onDragMove={action(onMouseMoveOrDragStage)}
          onDragEnd={action(onDragEndStage)}>
          <Layer>
            {fieldImage && (
              <Image
                image={fieldImage}
                width={(fieldImage.width / fieldImage.height) * fcc.pixelHeight}
                height={fcc.pixelHeight}
                onClick={action(onClickFieldImage)}
              />
            )}
            {app.magnet.map((magnetRef, idx) => (
              <MagnetReferenceLine key={idx} magnetRef={magnetRef} fcc={fcc} />
            ))}
            {visiblePaths.map(path => (
              <PathPoints key={path.uid} path={path} fcc={fcc} />
            ))}
            {visiblePaths.map(path => (
              <PathSegments key={path.uid} path={path} fcc={fcc} />
            ))}
            {visiblePaths.map(path => (
              <PathControls
                key={path.uid}
                path={path}
                fcc={fcc}
                isGrabAndMove={fieldEditor.offsetStart !== undefined}
              />
            ))}
            {app.gc.showRobot && app.robot.position.visible && (
              <RobotElement fcc={fcc} pos={app.robot.position} width={app.gc.robotWidth} height={app.gc.robotHeight} />
            )}
            <Group name="selected-controls" />
            <AreaSelectionElement
              from={fieldEditor.areaSelection?.from}
              to={fieldEditor.areaSelection?.to}
              animation={tiHandler.keys.length !== 0}
            />
          </Layer>
        </Stage>
      </Box>
    </Padding0Tooltip>
  );
});

export { FieldCanvasElement };

