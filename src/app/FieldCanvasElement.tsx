import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { EndPointControl, Path, Spline, Vector } from '../math/Path';
import Konva from 'konva';
import { Circle, Image, Layer, Line, Stage } from 'react-konva';
import { SplineElement } from "./SplineElement";
import { AppProps } from "../App";
import React from "react";
import useImage from "use-image";

import fieldImageUrl from '../static/field2023.png'
import { SplineControlElement } from "./SplineControlElement";
import { AreaElement } from "./AreaElement";
import { UnitConverter, UnitOfLength } from "../math/Unit";
import { CanvasConverter } from "../math/Canvas";
import { clamp } from "./Util";

const FieldCanvasElement = observer((props: AppProps) => {
  // useTimer(1000 / 30);

  const uc = new UnitConverter(UnitOfLength.Foot, props.app.gc.uol);
  const canvasSizeInPx = window.innerHeight * (props.app.view.showSpeedCanvas ? 0.78 : 0.94);
  const canvasSizeInUOL = uc.fromAtoB(12);

  const paths = props.paths;

  const [fieldImage] = useImage(fieldImageUrl);

  const [areaSelectionStart, setAreaSelectionStart] = React.useState<Vector | undefined>(undefined);
  const [areaSelectionEnd, setAreaSelectionEnd] = React.useState<Vector | undefined>(undefined);
  const [isAddingControl, setIsAddingControl] = React.useState(false);
  const [offsetStart, setOffsetStart] = React.useState<Vector | undefined>(undefined); // ALGO: For "Grab & Move"
  const offset = props.app.fieldOffset;
  const scale = props.app.fieldScale;

  const cc = new CanvasConverter(canvasSizeInPx, canvasSizeInPx, canvasSizeInUOL, canvasSizeInUOL, offset, scale);

  function onWheelStage(event: Konva.KonvaEventObject<WheelEvent>) {
    const evt = event.evt;

    const wheel = evt.deltaY;
    // UX: Zoom in/out if: wheel while ctrl key down
    if (wheel === 0 || !evt.ctrlKey) return;

    evt.preventDefault();

    const pos = cc.getUnboundedPxFromEvent(event, false, false);
    if (pos === undefined) return;

    const negative1 = new Vector(-1, -1);

    const newScale = clamp(scale * (1 - wheel / 1000), 1, 3);
    const scaleVector = new Vector(scale, scale);
    const newScaleVector = new Vector(newScale, newScale);

    // offset is offset in Konva coordinate system (KC)
    // offsetInCC is offset in HTML Canvas coordinate system (CC)
    const offsetInCC = offset.multiply(scaleVector).multiply(negative1);

    const canvasHalfSizeWithScale = (cc.pixelWidth * scale) / 2;
    const newCanvasHalfSizeWithScale = (cc.pixelWidth * newScale) / 2;

    // UX: Maintain zoom center at mouse pointer
    const fieldCenter = offsetInCC.add(new Vector(canvasHalfSizeWithScale, canvasHalfSizeWithScale));
    const newFieldCenter = offsetInCC.add(new Vector(newCanvasHalfSizeWithScale, newCanvasHalfSizeWithScale));
    const relativePos = pos.subtract(fieldCenter).divide(scaleVector);
    const newPos = newFieldCenter.add(relativePos.multiply(newScaleVector));
    const newOffsetInCC = pos.subtract(newPos).add(offsetInCC);
    const newOffsetInKC = newOffsetInCC.multiply(negative1).divide(newScaleVector);

    props.app.fieldScale = newScale;
    props.app.fieldOffset = newOffsetInKC;
  }

  function onMouseDownStage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    if ((evt.button === 0 || evt.button === 2) && event.target instanceof Konva.Image) {
      // UX: A flag to indicate that the user is adding a control, this will set to false if mouse is moved
      // UX: onClickFieldImage will check this state, control can only be added inside the field image because of this
      setIsAddingControl(true);
    }

    if (evt.button === 0 && offsetStart === undefined &&
      (event.target instanceof Konva.Stage || event.target instanceof Konva.Image)) { // left click
      // UX: Only start selection if: left click on the canvas or field image
      // UX: Do not start selection if it is in "Grab & Move"

      if (evt.shiftKey === false) {
        // UX: Clear selection if: left click without shift
        props.app.clearSelected();
      }

      // UX: selectedBefore is empty if: left click without shift
      props.app.startAreaSelection();

      const posInPx = cc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;
      setAreaSelectionStart(posInPx);
    } else if (evt.button === 1 && areaSelectionStart === undefined) { // middle click
      // UX: Start "Grab & Move" if: middle click at any position
      evt.preventDefault(); // UX: Prevent default action (scrolling)

      const posInPx = cc.getUnboundedPxFromEvent(event, false);
      if (posInPx === undefined) return;

      setOffsetStart(posInPx.add(offset));
    } else if (evt.button === 1 && areaSelectionStart !== undefined) { // middle click
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

    // UX: It is not actually dragged, but the event is triggered even the mouse is outside the canvas
    if (event.target instanceof Konva.Stage) event.target.setPosition(new Vector(0, 0));

    setIsAddingControl(false);

    if (areaSelectionStart !== undefined) { // UX: Select control point if mouse down on field image
      const posInPx = cc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;

      setAreaSelectionEnd(posInPx);
      props.app.updateAreaSelection(cc.toUOL(areaSelectionStart), cc.toUOL(posInPx));
    } else if (offsetStart !== undefined) { // UX: Move field if: middle click
      const posInPx = cc.getUnboundedPxFromEvent(event, false);
      if (posInPx === undefined) return;

      const newOffset = offsetStart.subtract(posInPx);
      newOffset.x = clamp(newOffset.x, -canvasSizeInPx * 0.9, canvasSizeInPx * 0.9);
      newOffset.y = clamp(newOffset.y, -canvasSizeInPx * 0.9, canvasSizeInPx * 0.9);
      props.app.fieldOffset = newOffset;
    }
  }

  function onMouseUpStage(event: Konva.KonvaEventObject<MouseEvent>) {
    // UX: This event is triggered only if the mouse is up inside the canvas.
    // UX: Only reset selection or "Grab & Move" if: left click or middle click released respectively

    if (event.evt.button === 0) { // left click
      setAreaSelectionStart(undefined);
      setAreaSelectionEnd(undefined);
    } else if (event.evt.button === 1) { // middle click
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

    if (event.evt === undefined) return; // XXX: Drag end event from spline control

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

    const posInPx = cc.getUnboundedPxFromEvent(event);
    if (posInPx === undefined) return;

    const cpInUOL = cc.toUOL(new EndPointControl(posInPx.x, posInPx.y, 0));


    // UX: Set target path to the first path if: no path is selected
    let targetPath: Path | undefined = props.app.interestedPath();
    if (targetPath === undefined) {
      // UX: Create new path if: no path exists
      // UX: Use user mouse position as the last control point
      targetPath = new Path(props.app.format.buildPathConfig(), new Spline(new EndPointControl(0, 0, 0), [], cpInUOL));
      props.app.addExpanded(targetPath);
      paths.push(targetPath);
    } else if (targetPath.visible && !targetPath.lock) {
      // UX: Add control point if: path is selected and visible and not locked
      if (evt.button === 0) {
        // UX: Add 4-controls curve if: left click
        targetPath.add4ControlsCurve(cpInUOL);
      } else if (evt.button === 2) {
        // UX: Add straight line if: right click
        targetPath.addLine(cpInUOL);
      }
    }

    // UX: Select the new control point
    props.app.clearSelected();
    props.app.addSelected(cpInUOL.uid);
  }

  const lineWidth = 1;
  const magnetInPx = cc.toPx(props.app.magnet);
  const visiblePaths = paths.filter((path) => path.visible);

  const pointRadius = cc.pixelWidth / 320;

  return (
    <Stage className='field-canvas' width={cc.pixelWidth} height={cc.pixelHeight}
      scale={new Vector(scale, scale)} offset={offset} draggable
      style={{ cursor: offsetStart ? 'grab' : '' }}
      onContextMenu={(e) => e.evt.preventDefault()}
      onWheel={action(onWheelStage)}
      onMouseDown={action(onMouseDownStage)}
      onMouseMove={action(onMouseMoveOrDragStage)}
      onMouseUp={action(onMouseUpStage)}
      onDragMove={action(onMouseMoveOrDragStage)}
      onDragEnd={action(onDragEndStage)}>
      <Layer>
        <Image image={fieldImage} width={cc.pixelWidth} height={cc.pixelHeight}
          onClick={action(onClickFieldImage)} />
        {
          props.app.magnet.x !== Infinity ? (
            <Line points={[magnetInPx.x, 0, magnetInPx.x, cc.pixelHeight]} stroke="red" strokeWidth={lineWidth} />
          ) : null
        }
        {
          props.app.magnet.y !== Infinity ? (
            <Line points={[0, magnetInPx.y, cc.pixelHeight, magnetInPx.y]} stroke="red" strokeWidth={lineWidth} />
          ) : null
        }
        {
          visiblePaths.map((path, index) => (
            <React.Fragment key={index}>
              {
                path.cachedResult.points.map((pointInUOL, index) => {
                  const pc = path.pc;

                  const speedFrom = pc.speedLimit.from;
                  const speedTo = pc.speedLimit.to;

                  const pointInPx = cc.toPx(pointInUOL);
                  const percentage = (pointInUOL.speed - speedFrom) / (speedTo - speedFrom);
                  // h => hue
                  // s => saturation
                  // l => lightness
                  const color = `hsl(${percentage * 90}, 70%, 50%)`; // red = min speed, green = max speed
                  return <Circle key={index} x={pointInPx.x} y={pointInPx.y} radius={pointRadius} fill={color} />
                })
              }
            </React.Fragment>
          ))
        }
        {
          visiblePaths.map((path, index) => (
            <React.Fragment key={index}>
              {
                path.splines.map((spline) => {
                  if (spline.isVisible()) return <SplineElement key={spline.uid} {...{ spline, path, cc, ...props }} />
                  else return null;
                })
              }
            </React.Fragment>
          ))
        }
        {
          visiblePaths.map((path, index) => (
            <React.Fragment key={index}>
              {
                path.splines.map((spline) =>
                  spline.controls.map((cp, cpIdx) => {
                    const isFirstSpline = path.splines[0] === spline;
                    if (!isFirstSpline && cpIdx === 0) return null;
                    if (cp.visible) return <SplineControlElement key={cpIdx} isGrabAndMove={offsetStart !== undefined} {...{ spline, path, cc, cp, ...props }} />;
                    else return null;
                  })
                )
              }
            </React.Fragment>
          ))
        }
        <AreaElement from={areaSelectionStart} to={areaSelectionEnd} />
      </Layer>
    </Stage>
  )
});

export { FieldCanvasElement };
