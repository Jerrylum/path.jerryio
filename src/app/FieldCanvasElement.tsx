import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { EndPointControl, Path, Segment, SegmentVariant, Vector } from "../core/Path";
import Konva from "konva";
import { Circle, Image, Layer, Line, Stage } from "react-konva";
import { SegmentElement } from "./SegmentElement";
import React from "react";
import useImage from "use-image";

import fieldImageUrl from "../static/field2023.png";
import { ControlElement } from "./ControlElement";
import { AreaElement } from "./AreaElement";
import { UnitConverter, UnitOfLength } from "../core/Unit";
import { FieldCanvasConverter } from "../core/Canvas";
import { clamp } from "../core/Util";
import { AddPath, AddSegment } from "../core/Command";
import { useAppStores } from "../core/MainApp";
import { RobotElement } from "./RobotElement";
import { firstDerivative, toDerivativeHeading, toHeading } from "../core/Calculation";
import ReactDOM from "react-dom";

const PathPoints = observer((props: { path: Path; fcc: FieldCanvasConverter }) => {
  const { path, fcc } = props;

  const pc = path.pc;
  const speedFrom = pc.speedLimit.from;
  const speedTo = pc.speedLimit.to;
  const pointRadius = fcc.pixelWidth / 320;

  // ALGO: This is a separate component because it is expensive to render.

  return (
    <>
      {path.cachedResult.points.map((pointInUOL, index) => {
        const pointInPx = fcc.toPx(pointInUOL);
        const percentage = (pointInUOL.speed - speedFrom) / (speedTo - speedFrom);
        // h => hue, s => saturation, l => lightness
        const color = `hsl(${percentage * 90}, 70%, 50%)`; // red = min speed, green = max speed
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

const FieldCanvasElement = observer((props: {}) => {
  const { app } = useAppStores();

  const uc = new UnitConverter(UnitOfLength.Foot, app.gc.uol);
  const canvasSizeInPx = window.innerHeight * (app.view.showSpeedCanvas ? 0.78 : 0.94);
  const canvasSizeInUOL = uc.fromAtoB(12);

  const paths = app.paths;

  const [fieldImage] = useImage(fieldImageUrl);

  const [areaSelectionStart, setAreaSelectionStart] = React.useState<Vector | undefined>(undefined);
  const [areaSelectionEnd, setAreaSelectionEnd] = React.useState<Vector | undefined>(undefined);
  const [isAddingControl, setIsAddingControl] = React.useState(false);
  const [offsetStart, setOffsetStart] = React.useState<Vector | undefined>(undefined); // ALGO: For "Grab & Move"
  const offset = app.fieldOffset;
  const scale = app.fieldScale;

  const fcc = new FieldCanvasConverter(canvasSizeInPx, canvasSizeInPx, canvasSizeInUOL, canvasSizeInUOL, offset, scale);

  function onWheelStage(event: Konva.KonvaEventObject<WheelEvent>) {
    const evt = event.evt;

    const wheel = evt.deltaY;
    // UX: Zoom in/out if: wheel while ctrl key down
    if (wheel === 0 || !evt.ctrlKey) return;

    evt.preventDefault();

    const pos = fcc.getUnboundedPxFromEvent(event, false, false);
    if (pos === undefined) return;

    const negative1 = new Vector(-1, -1);

    const newScale = clamp(scale * (1 - wheel / 1000), 1, 3);
    const scaleVector = new Vector(scale, scale);
    const newScaleVector = new Vector(newScale, newScale);

    // offset is offset in Konva coordinate system (KC)
    // offsetInCC is offset in HTML Canvas coordinate system (CC)
    const offsetInCC = offset.multiply(scaleVector).multiply(negative1);

    const canvasHalfSizeWithScale = (fcc.pixelWidth * scale) / 2;
    const newCanvasHalfSizeWithScale = (fcc.pixelWidth * newScale) / 2;

    // UX: Maintain zoom center at mouse pointer
    const fieldCenter = offsetInCC.add(new Vector(canvasHalfSizeWithScale, canvasHalfSizeWithScale));
    const newFieldCenter = offsetInCC.add(new Vector(newCanvasHalfSizeWithScale, newCanvasHalfSizeWithScale));
    const relativePos = pos.subtract(fieldCenter).divide(scaleVector);
    const newPos = newFieldCenter.add(relativePos.multiply(newScaleVector));
    const newOffsetInCC = pos.subtract(newPos).add(offsetInCC);
    const newOffsetInKC = newOffsetInCC.multiply(negative1).divide(newScaleVector);

    app.fieldScale = newScale;
    app.fieldOffset = newOffsetInKC;
  }

  function onMouseDownStage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    if ((evt.button === 0 || evt.button === 2) && event.target instanceof Konva.Image) {
      // UX: A flag to indicate that the user is adding a control, this will set to false if mouse is moved
      // UX: onClickFieldImage will check this state, control can only be added inside the field image because of this
      setIsAddingControl(true);
    }

    if (
      evt.button === 0 &&
      offsetStart === undefined &&
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
      app.startAreaSelection();

      const posInPx = fcc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;
      setAreaSelectionStart(posInPx);
    } else if (evt.button === 1 && areaSelectionStart === undefined) {
      // middle click
      // UX: Start "Grab & Move" if: middle click at any position
      evt.preventDefault(); // UX: Prevent default action (scrolling)

      const posInPx = fcc.getUnboundedPxFromEvent(event, false);
      if (posInPx === undefined) return;

      setOffsetStart(posInPx.add(offset));
    } else if (evt.button === 1 && areaSelectionStart !== undefined) {
      // middle click
      // UX: Do not start "Grab & Move" if it is in area selection, but still prevent default
      evt.preventDefault(); // UX: Prevent default action (scrolling)
    }
  }

  function onMouseMoveOrDragStage(event: Konva.KonvaEventObject<DragEvent | MouseEvent>) {
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

    setIsAddingControl(false);

    if (areaSelectionStart !== undefined) {
      // UX: Select control point if mouse down on field image
      const posInPx = fcc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;

      // UX: Use flushSync to prevent lagging
      // See: https://github.com/reactwg/react-18/discussions/21
      ReactDOM.flushSync(() => setAreaSelectionEnd(posInPx));
      app.updateAreaSelection(fcc.toUOL(areaSelectionStart), fcc.toUOL(posInPx));
    } else if (offsetStart !== undefined) {
      // UX: Move field if: middle click
      const posInPx = fcc.getUnboundedPxFromEvent(event, false);
      if (posInPx === undefined) return;

      const newOffset = offsetStart.subtract(posInPx);
      newOffset.x = clamp(newOffset.x, -canvasSizeInPx * 0.9, canvasSizeInPx * 0.9);
      newOffset.y = clamp(newOffset.y, -canvasSizeInPx * 0.9, canvasSizeInPx * 0.9);
      app.fieldOffset = newOffset;
    } else if (app.gc.showRobot) {
      // UX: Show robot if: alt key is down and no other action is performed
      const posInPx = fcc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;
      const posInUOL = fcc.toUOL(posInPx);

      const interested = app.interestedPath();
      if (interested === undefined) return;

      const magnetDistance = app.gc.controlMagnetDistance;

      const points = interested.cachedResult.points;

      let closestPoint = undefined;
      let closestDistance = Number.MAX_VALUE;
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const distance = point.distance(posInUOL);
        if (distance < closestDistance) {
          closestPoint = point;
          closestDistance = distance;
        }
      }

      if (closestPoint !== undefined && closestDistance < magnetDistance * 4) {
        app.robot.position.setXY(closestPoint);

        const t = closestPoint.sampleT;
        const segment = closestPoint.sampleRef;
        const c0 = segment.first;
        const c3 = segment.last;

        if (app.gc.robotIsHolonomic) {
          const c3Heading = toDerivativeHeading(c0.heading, c3.heading);
          app.robot.position.heading = c0.heading + c3Heading * t;
        } else {
          const heading = toHeading(firstDerivative(closestPoint.sampleRef, closestPoint.sampleT));
          app.robot.position.heading = heading;
        }

        app.robot.position.visible = true;
      }
    }
  }

  function onMouseUpStage(event: Konva.KonvaEventObject<MouseEvent>) {
    // UX: This event is triggered only if the mouse is up inside the canvas.
    // UX: Only reset selection or "Grab & Move" if: left click or middle click released respectively

    if (event.evt.button === 0) {
      // left click
      setAreaSelectionStart(undefined);
      setAreaSelectionEnd(undefined);
    } else if (event.evt.button === 1) {
      // middle click
      setOffsetStart(undefined);
    }
  }

  function onDragEndStage(event: Konva.KonvaEventObject<DragEvent>) {
    /*
    UX:
    If the mouse is down(any buttons), the drag end event is triggered.
    After that, without dragging, we lose the information of the mouse position outside the canvas.
    We reset everything if the mouse is down outside the canvas.
    */

    const rect = event.target.getStage()?.container().getBoundingClientRect();
    if (rect === undefined) return;

    if (event.evt === undefined) return; // XXX: Drag end event from segment control

    const clientX = event.evt.clientX;
    const clientY = event.evt.clientY;

    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setAreaSelectionStart(undefined);
      setAreaSelectionEnd(undefined);
      setOffsetStart(undefined);
    }
  }

  function onClickFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Add control point if: left click or right click without moving the mouse
    if (!(isAddingControl && (evt.button === 0 || evt.button === 2))) return;

    setIsAddingControl(false);

    const posInPx = fcc.getUnboundedPxFromEvent(event);
    if (posInPx === undefined) return;

    const cpInUOL = fcc.toUOL(new EndPointControl(posInPx.x, posInPx.y, 0));

    // UX: Set target path to "interested path"
    let targetPath: Path | undefined = app.interestedPath();
    if (targetPath === undefined) {
      // UX: Create new path if: no path exists
      // UX: Use user mouse position as the last control point
      targetPath = new Path(app.format.buildPathConfig(), new Segment(new EndPointControl(0, 0, 0), [], cpInUOL));
      app.history.execute(`Add path ${targetPath.uid}`, new AddPath(app.paths, targetPath));
    } else if (targetPath.visible && !targetPath.lock) {
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

  const lineWidth = 1;
  const magnetInPx = fcc.toPx(app.magnet);
  const visiblePaths = paths.filter(path => path.visible);

  return (
    <Stage
      className="field-canvas"
      width={fcc.pixelWidth}
      height={fcc.pixelHeight}
      scale={new Vector(scale, scale)}
      offset={offset}
      draggable
      style={{ cursor: offsetStart ? "grab" : "" }}
      onContextMenu={e => e.evt.preventDefault()}
      onWheel={action(onWheelStage)}
      onMouseDown={action(onMouseDownStage)}
      onMouseMove={action(onMouseMoveOrDragStage)}
      onMouseUp={action(onMouseUpStage)}
      onDragMove={action(onMouseMoveOrDragStage)}
      onDragEnd={action(onDragEndStage)}>
      <Layer>
        <Image image={fieldImage} width={fcc.pixelWidth} height={fcc.pixelHeight} onClick={action(onClickFieldImage)} />
        {app.magnet.x !== Infinity ? (
          <Line points={[magnetInPx.x, 0, magnetInPx.x, fcc.pixelHeight]} stroke="red" strokeWidth={lineWidth} />
        ) : null}
        {app.magnet.y !== Infinity ? (
          <Line points={[0, magnetInPx.y, fcc.pixelHeight, magnetInPx.y]} stroke="red" strokeWidth={lineWidth} />
        ) : null}
        {visiblePaths.map(path => (
          <PathPoints key={path.uid} path={path} fcc={fcc} />
        ))}
        {visiblePaths.map(path => (
          <PathSegments key={path.uid} path={path} fcc={fcc} />
        ))}
        {visiblePaths.map(path => (
          <PathControls key={path.uid} path={path} fcc={fcc} isGrabAndMove={offsetStart !== undefined} />
        ))}
        {app.gc.showRobot && app.robot.position.visible && (
          <RobotElement fcc={fcc} pos={app.robot.position} width={app.gc.robotWidth} height={app.gc.robotHeight} />
        )}
        <AreaElement from={areaSelectionStart} to={areaSelectionEnd} />
      </Layer>
    </Stage>
  );
});

export { FieldCanvasElement };
