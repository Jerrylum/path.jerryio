import { action, makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";
import { EndControl, Path, SegmentVariant, Vector } from "../core/Path";
import Konva from "konva";
import { Circle, Group, Image, Layer, Line, Stage } from "react-konva";
import { SegmentElement } from "./SegmentElement";
import React from "react";
import useImage from "use-image";

import fieldImageUrl from "../static/field2023.png";
import { ControlElement } from "./ControlElement";
import { AreaElement } from "./AreaElement";
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

class FieldController {
  fcc!: FieldCanvasConverter;

  areaSelectionStart: Vector | undefined = undefined;
  areaSelectionEnd: Vector | undefined = undefined;
  isAddingControl: boolean = false;
  offsetStart: Vector | undefined = undefined;

  constructor() {
    makeAutoObservable(this, { fcc: false });
  }

  doAreaSelection(posInPx: Vector): boolean {
    const { app } = getAppStores();

    if (this.areaSelectionStart === undefined) return false;
    // UX: Select control point if mouse down on field image

    // UX: Use flushSync to prevent lagging
    // See: https://github.com/reactwg/react-18/discussions/21
    // ReactDOM.flushSync(() => setAreaSelectionEnd(posInPx));
    ReactDOM.flushSync(action(() => (this.areaSelectionEnd = posInPx)));
    app.updateAreaSelection(this.fcc.toUOL(this.areaSelectionStart), this.fcc.toUOL(posInPx));
    return true;
  }

  doPanning(posInPx: Vector): boolean {
    const { app } = getAppStores();

    // UX: Move field if: middle click
    if (this.offsetStart === undefined) return false;

    const newOffset = this.offsetStart.subtract(posInPx);
    newOffset.x = clamp(
      newOffset.x,
      -this.fcc.pixelWidth * 0.9 + this.fcc.viewOffset.x,
      this.fcc.pixelWidth * 0.9 - this.fcc.viewOffset.x
    );
    newOffset.y = clamp(newOffset.y, -this.fcc.pixelHeight * 0.9, this.fcc.pixelHeight * 0.9);
    app.fieldOffset = newOffset;
    return true;
  }

  doPanningWithVector(vec: Vector): boolean {
    const { app } = getAppStores();

    // UX: Move field if offsetStart is not undefined, the value is not used in the calculation but still need to check
    if (this.offsetStart === undefined) return false;

    const newOffset = app.fieldOffset.subtract(vec);
    newOffset.x = clamp(
      newOffset.x,
      -this.fcc.pixelWidth * 0.9 + this.fcc.viewOffset.x,
      this.fcc.pixelWidth * 0.9 - this.fcc.viewOffset.x
    );
    newOffset.y = clamp(newOffset.y, -this.fcc.pixelHeight * 0.9, this.fcc.pixelHeight * 0.9);
    app.fieldOffset = newOffset;
    return true;
  }

  doShowRobot(posInPx: Vector): boolean {
    const { app } = getAppStores();

    // UX: Show robot if: alt key is down and no other action is performed
    if (app.gc.showRobot === false) return false;

    if (posInPx === undefined) return false;
    const posInUOL = this.fcc.toUOL(posInPx);

    const interested = app.interestedPath();
    if (interested === undefined) return false;

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

    return true;
  }

  doScaleField(variable: number, posInPx: Vector): boolean {
    const { app } = getAppStores();

    const oldScale = app.fieldScale;
    const oldOffset = app.fieldOffset;

    const newScale = clamp(variable, 1, 3);

    // offset is offset in Konva coordinate system (KC)
    // offsetInCC is offset in HTML Canvas coordinate system (CC)
    const offsetInCC = oldOffset.multiply(oldScale).multiply(-1);

    const canvasHalfSizeWithScale = (this.fcc.pixelHeight * oldScale) / 2;
    const newCanvasHalfSizeWithScale = (this.fcc.pixelHeight * newScale) / 2;

    // UX: Maintain zoom center at mouse pointer
    const fieldCenter = offsetInCC.add(canvasHalfSizeWithScale);
    const newFieldCenter = offsetInCC.add(newCanvasHalfSizeWithScale);
    const relativePos = posInPx.subtract(fieldCenter).divide(oldScale);
    const newPos = newFieldCenter.add(relativePos.multiply(newScale));
    const newOffsetInCC = posInPx.subtract(newPos).add(offsetInCC);
    const newOffsetInKC = newOffsetInCC.multiply(-1).divide(newScale);

    app.fieldScale = newScale;
    app.fieldOffset = newOffsetInKC;

    return true;
  }
}

enum TouchAction {
  None,
  PanningAndScaling,
  Selection
}

class TouchInteractiveHandler {
  touchAction: TouchAction = TouchAction.None;
  touchesLastPosition: { [identifier: number]: Vector } = {};
  touchesVector: { [identifier: number]: Vector } = {};

  startSelectionTimer: NodeJS.Timer | undefined = undefined;
  initialFieldScale: number = 0;
  initialPosition: Vector = new Vector(0, 0);
  initialDistanceBetweenTwoTouches: number = 0;

  constructor(private fieldCtrl: FieldController) {
    makeAutoObservable(this);
  }

  private toVector(t: Touch) {
    return new Vector(t.clientX, t.clientY);
  }

  onTouchStart = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const { app } = getAppStores();

    const evt = event.evt;

    [...evt.touches].forEach(t => {
      const pos = this.toVector(t);
      const lastPos = this.touchesLastPosition[t.identifier] ?? pos;
      this.touchesVector[t.identifier] = pos.subtract(lastPos);
      this.touchesLastPosition[t.identifier] = pos;
    });

    const keys = this.keys;

    if (evt.touches.length === 1) {
      // ALGO: Start selection if one finger is down
      this.startSelectionTimer = setInterval(() => {
        this.touchAction = TouchAction.Selection;
      }, 500); // Magic number
      this.initialPosition = this.pos(keys[0]);
    } else if (evt.touches.length >= 2) {
      // ALGO: Cancel selection if two fingers are down
      clearInterval(this.startSelectionTimer);
      this.startSelectionTimer = undefined;

      const touch1 = this.pos(keys[0]);
      const touch2 = this.pos(keys[1]);
      const distance = touch1.distance(touch2);
      this.initialFieldScale = app.fieldScale;
      this.initialPosition = touch1.add(touch2).divide(2);
      this.initialDistanceBetweenTwoTouches = Math.max(distance, 0.1);
    }

    if (keys.length > 0) {
      this.fieldCtrl.offsetStart = this.pos(keys[0]);
    }
  };

  onTouchMove = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const { app } = getAppStores();

    const evt = event.evt;

    [...evt.touches].forEach(t => {
      const pos = this.toVector(t);
      const lastPos = this.touchesLastPosition[t.identifier] ?? pos;
      this.touchesVector[t.identifier] = pos.subtract(lastPos);
      this.touchesLastPosition[t.identifier] = pos;
    });

    const keys = this.keys;

    if (this.touchAction === TouchAction.None) {
      if (keys.length === 1) {
        const t = this.pos(keys[0]);
        if (t.distance(this.initialPosition) > 48) {
          // ALGO: Cancel the timer for selection if the user moves the finger more than 1/2 inch
          clearInterval(this.startSelectionTimer);
          this.startSelectionTimer = undefined;
        }
        // Set the touch action to panning and scaling
        this.touchAction = TouchAction.PanningAndScaling;
      } else {
        this.touchAction = TouchAction.PanningAndScaling;
      }
    } else if (this.touchAction === TouchAction.PanningAndScaling) {
      if (keys.length === 1) {
        this.fieldCtrl.doPanningWithVector(this.touchesVector[this.keys[0]].divide(app.fieldScale));
      } else if (keys.length >= 2) {
        const t1 = this.pos(keys[0]);
        const t2 = this.pos(keys[1]);
        const scale = this.initialFieldScale * (t1.distance(t2) / this.initialDistanceBetweenTwoTouches);
        const middlePos = t1.add(t2).divide(2);
        this.fieldCtrl.doScaleField(scale, middlePos);
  
        const vecPos = this.vec(keys[0]).add(this.vec(keys[1])).divide(2);
        this.fieldCtrl.doPanningWithVector(vecPos.divide(app.fieldScale));
      }
    } else if (this.touchAction === TouchAction.Selection) {
      const posInPx = this.fieldCtrl.fcc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;

      if (this.fieldCtrl.areaSelectionStart === undefined) {
        this.fieldCtrl.areaSelectionStart = posInPx;
      } else {
        this.fieldCtrl.doAreaSelection(posInPx);
      }
    }
  };

  onTouchEnd = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const evt = event.evt;

    [...evt.changedTouches].forEach(t => {
      delete this.touchesVector[t.identifier];
      delete this.touchesLastPosition[t.identifier];
    });

    if (evt.touches.length === 0) {
      // TODO
      this.touchAction = TouchAction.None;
      this.touchesVector = {};
      this.touchesLastPosition = {};
      this.fieldCtrl.areaSelectionStart = undefined;
      this.fieldCtrl.areaSelectionEnd = undefined;
      this.fieldCtrl.offsetStart = undefined;

      // ALGO: Cancel selection if the user lifts the finger
      clearInterval(this.startSelectionTimer);
      this.startSelectionTimer = undefined;
    }
  };

  private get keys() {
    return Object.keys(this.touchesVector).map(k => parseInt(k));
  }

  private pos(key: number) {
    return this.touchesLastPosition[key];
  }

  private vec(key: number) {
    return this.touchesVector[key];
  }
}

const FieldCanvasElement = observer((props: {}) => {
  const { app, appPreferences } = getAppStores();

  const windowSize = useWindowSize((newSize: Vector, oldSize: Vector) => {
    const ratio = (newSize.y + oldSize.y) / 2 / oldSize.y;
    app.fieldOffset = app.fieldOffset.multiply(ratio);
  });

  const uc = new UnitConverter(UnitOfLength.Millimeter, app.gc.uol);
  const isExclusiveLayout = appPreferences.layoutType === LayoutType.EXCLUSIVE;

  const canvasHeightInPx = windowSize.y * (isExclusiveLayout ? 1 : app.view.showSpeedCanvas ? 0.78 : 0.94);
  const canvasWidthInPx = isExclusiveLayout ? windowSize.x : canvasHeightInPx;
  const canvasSizeInUOL = uc.fromAtoB(3683); // 3683 = 145*2.54*10 ~= 3676.528, the size of the field perimeter in Fusion 360

  const [fieldImage] = useImage(fieldImageUrl);

  const offset = app.fieldOffset;
  const scale = app.fieldScale;

  const fcc = new FieldCanvasConverter(
    canvasWidthInPx,
    canvasHeightInPx,
    canvasSizeInUOL,
    canvasSizeInUOL,
    offset,
    scale
  );

  const fieldCtrl = React.useState(new FieldController())[0];
  fieldCtrl.fcc = fcc;
  const tiHandler = React.useState(new TouchInteractiveHandler(fieldCtrl))[0];

  function onTouchStartStage(event: Konva.KonvaEventObject<TouchEvent>) {
    const evt = event.evt;

    evt.preventDefault();

    // const touches = evt.touches;

    // if (touches.length === 1) {
    //   console.log("onTouchStartStage: 1 touch", touches.item(0));

    //   if (fieldCtrl.areaSelectionStart === undefined) {
    //     const posWithOffsetInPx = fcc.getUnboundedPxFromEvent(event, false);
    //     if (posWithOffsetInPx === undefined) return;

    //     fieldCtrl.offsetStart = posWithOffsetInPx.add(offset);
    //   }
    // } else {
    //   // TODO
    // }

    tiHandler.onTouchStart(event);
  }

  function onTouchMoveStage(event: Konva.KonvaEventObject<TouchEvent>) {
    const evt = event.evt;

    evt.preventDefault();

    // const touches = evt.touches;

    // if (touches.length === 1) {
    //   console.log("onTouchMoveStage: 1 touch", event.evt.type);

    //   const posInPx = fcc.getUnboundedPxFromEvent(event);
    //   if (posInPx === undefined) return;
    //   const posWithOffsetInPx = fcc.getUnboundedPxFromEvent(event, false);
    //   if (posWithOffsetInPx === undefined) return;

    //   // TODO
    //   fieldCtrl.doAreaSelection(posInPx) || fieldCtrl.doPanning(posWithOffsetInPx) || fieldCtrl.doShowRobot(posInPx);
    // } else {
    //   // TODO
    // }

    tiHandler.onTouchMove(event);
  }

  function onTouchEndStage(event: Konva.KonvaEventObject<TouchEvent>) {
    const evt = event.evt;

    // const touches = evt.touches;

    // if (touches.length === 0) {
    //   // TODO
    //   fieldCtrl.areaSelectionStart = undefined;
    //   fieldCtrl.areaSelectionEnd = undefined;
    //   fieldCtrl.offsetStart = undefined;
    // }

    tiHandler.onTouchEnd(event);
  }

  function onWheelStage(event: Konva.KonvaEventObject<WheelEvent>) {
    const evt = event.evt;

    if (
      evt.ctrlKey === false &&
      (evt.deltaX !== 0 || evt.deltaY !== 0) &&
      fieldCtrl.offsetStart === undefined &&
      app.wheelControl("panning")
    ) {
      // UX: Panning if: ctrl key up + wheel/mouse pad + no "Grab & Move" + not changing heading value with scroll wheel in the last 300ms

      evt.preventDefault();

      const newOffset = app.fieldOffset.add(new Vector(evt.deltaX * 0.5, evt.deltaY * 0.5));
      newOffset.x = clamp(
        newOffset.x,
        -canvasWidthInPx * 0.9 + fcc.viewOffset.x,
        canvasWidthInPx * 0.9 - fcc.viewOffset.x
      );
      newOffset.y = clamp(newOffset.y, -canvasHeightInPx * 0.9, canvasHeightInPx * 0.9);
      app.fieldOffset = newOffset;
    } else if (evt.ctrlKey === true && evt.deltaY !== 0) {
      // UX: Zoom in/out if: wheel while ctrl key down

      evt.preventDefault();

      const pos = fcc.getUnboundedPxFromEvent(event, false, false);
      if (pos === undefined) return;

      fieldCtrl.doScaleField(scale * (1 - evt.deltaY / 1000), pos);
    }
  }

  function onMouseDownStage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    if ((evt.button === 0 || evt.button === 2) && event.target instanceof Konva.Image) {
      // UX: A flag to indicate that the user is adding a control, this will set to false if mouse is moved
      // UX: onClickFieldImage will check this state, control can only be added inside the field image because of this
      fieldCtrl.isAddingControl = true;
    }

    if (
      evt.button === 0 &&
      fieldCtrl.offsetStart === undefined &&
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
      fieldCtrl.areaSelectionStart = posInPx;
    } else if (evt.button === 1 && fieldCtrl.areaSelectionStart === undefined) {
      // middle click
      // UX: Start "Grab & Move" if: middle click at any position
      evt.preventDefault(); // UX: Prevent default action (scrolling)

      const posInPx = fcc.getUnboundedPxFromEvent(event, false);
      if (posInPx === undefined) return;

      fieldCtrl.offsetStart = posInPx.add(offset);
    } else if (evt.button === 1 && fieldCtrl.areaSelectionStart !== undefined) {
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
      fieldCtrl.isAddingControl = false;

      const posInPx = fcc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;
      const posWithOffsetInPx = fcc.getUnboundedPxFromEvent(event, false);
      if (posWithOffsetInPx === undefined) return;

      fieldCtrl.doAreaSelection(posInPx) || fieldCtrl.doPanning(posWithOffsetInPx) || fieldCtrl.doShowRobot(posInPx);
    }
  }

  function onMouseUpStage(event: Konva.KonvaEventObject<MouseEvent>) {
    // UX: This event is triggered only if the mouse is up inside the canvas.
    // UX: Only reset selection or "Grab & Move" if: left click or middle click released respectively

    if (event.evt.button === 0) {
      // left click
      fieldCtrl.areaSelectionStart = undefined;
      fieldCtrl.areaSelectionEnd = undefined;
    } else if (event.evt.button === 1) {
      // middle click
      fieldCtrl.offsetStart = undefined;
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
      fieldCtrl.areaSelectionStart = undefined;
      fieldCtrl.areaSelectionEnd = undefined;
      fieldCtrl.offsetStart = undefined;
      app.magnet = [];
    }
  }

  function onClickFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Add control point if: left click or right click without moving the mouse
    if (!(fieldCtrl.isAddingControl && (evt.button === 0 || evt.button === 2))) return;

    fieldCtrl.isAddingControl = false;

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
    <Stage
      className="field-canvas"
      width={fcc.pixelWidth}
      height={fcc.pixelHeight}
      scale={new Vector(scale, scale)}
      offset={offset.subtract(fcc.viewOffset)}
      draggable
      style={{ cursor: fieldCtrl.offsetStart ? "grab" : "" }}
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
          <PathControls key={path.uid} path={path} fcc={fcc} isGrabAndMove={fieldCtrl.offsetStart !== undefined} />
        ))}
        {app.gc.showRobot && app.robot.position.visible && (
          <RobotElement fcc={fcc} pos={app.robot.position} width={app.gc.robotWidth} height={app.gc.robotHeight} />
        )}
        <Group name="selected-controls" />
        <AreaElement from={fieldCtrl.areaSelectionStart} to={fieldCtrl.areaSelectionEnd} />
      </Layer>
    </Stage>
  );
});

export { FieldCanvasElement };
