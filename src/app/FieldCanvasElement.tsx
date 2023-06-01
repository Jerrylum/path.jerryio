import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { EndPointControl, Path, Spline, Vertex } from '../math/Path';
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
  const canvasSizeInPx = window.innerHeight * 0.78;
  const canvasSizeInUOL = uc.fromAtoB(12);

  const paths = props.paths;

  const [fieldImage] = useImage(fieldImageUrl);

  const [areaSelectionStart, setAreaSelectionStart] = React.useState<Vertex | undefined>(undefined);
  const [areaSelectionEnd, setAreaSelectionEnd] = React.useState<Vertex | undefined>(undefined);
  const [isAddingControl, setIsAddingControl] = React.useState(false);
  const [offsetStart, setOffsetStart] = React.useState<Vertex | undefined>(undefined); // ALGO: For "Grab & Move"
  const [offset, setOffset] = React.useState<Vertex>(new Vertex(0, 0));
  const [scale, setScale] = React.useState(1);

  const cc = new CanvasConverter(canvasSizeInPx, canvasSizeInPx, canvasSizeInUOL, canvasSizeInUOL, offset, scale);

  function onMouseDownFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: this will set to false if mouse is moved
    setIsAddingControl(true);

    // UX: Only start selection if: left click on the field image
    // UX: Do not start selection if it is in "Grab & Move"
    if (evt.button === 0 && offsetStart === undefined) { // left click

      if (evt.shiftKey === false) {
        // UX: Clear selection if: left click without shift
        props.app.selected = [];
      }

      // UX: selectedBefore is empty if: left click without shift
      props.app.startAreaSelection();

      const posInPx = cc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;
      setAreaSelectionStart(posInPx);
    }
  }

  function onWheelCanvas(event: Konva.KonvaEventObject<WheelEvent>) {
    const evt = event.evt;

    const wheel = evt.deltaY;
    // UX: Zoom in/out if: wheel while ctrl key down
    if (wheel === 0 || !evt.ctrlKey) return;

    evt.preventDefault();

    const pos = cc.getUnboundedPxFromEvent(event, false, false);
    if (pos === undefined) return;

    const negative1 = new Vertex(-1, -1);

    const newScale = clamp(scale * (1 - wheel / 1000), 1, 3);
    const scaleVertex = new Vertex(scale, scale);
    const newScaleVertex = new Vertex(newScale, newScale);

    // offset is offset in Knova coordinate system (KC)
    // offsetInCC is offset in HTML Canvas coordinate system (CC)
    const offsetInCC = offset.multiply(scaleVertex).multiply(negative1);

    const canvasHalfSizeWithScale = (cc.pixelWidth * scale) / 2;
    const newCanvasHalfSizeWithScale = (cc.pixelWidth * newScale) / 2;

    // UX: Maintain zoom center at mouse pointer
    const fieldCenter = offsetInCC.add(new Vertex(canvasHalfSizeWithScale, canvasHalfSizeWithScale));
    const newFieldCenter = offsetInCC.add(new Vertex(newCanvasHalfSizeWithScale, newCanvasHalfSizeWithScale));
    const relativePos = pos.subtract(fieldCenter).divide(scaleVertex);
    const newPos = newFieldCenter.add(relativePos.multiply(newScaleVertex));
    const newOffsetInCC = pos.subtract(newPos).add(offsetInCC);
    const newOffsetInKC = newOffsetInCC.multiply(negative1).divide(newScaleVertex);

    setScale(newScale);
    setOffset(newOffsetInKC);
  }

  function onMouseDownCanvas(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Start "Grab & Move" if: middle click at any position
    if (evt.button === 1) { // middle click
      evt.preventDefault();

      // UX: Do not start "Grab & Move" if it is in area selection, but prevent default
      if (areaSelectionStart !== undefined) return;

      const posInPx = cc.getUnboundedPxFromEvent(event, false);
      if (posInPx === undefined) return;

      setOffsetStart(posInPx.add(offset));
    }
  }

  function onMouseMoveCanvas(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    setIsAddingControl(false);

    if (areaSelectionStart !== undefined) { // UX: Select control point if mouse down on field image
      const posInPx = cc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;

      setAreaSelectionEnd(posInPx);
      props.app.updateAreaSelection(cc.toUOL(areaSelectionStart), cc.toUOL(posInPx));
    } else if (offsetStart !== undefined) { // UX: Move field if: middle click
      const posInPx = cc.getUnboundedPxFromEvent(event, false);
      if (posInPx === undefined) return;

      setOffset(offsetStart.subtract(posInPx));
    }
  }

  function onMouseUpCanvas(event: Konva.KonvaEventObject<MouseEvent>) {
    // UX: Only reset selection or "Grab & Move" if: left click or middle click released respectively

    if (event.evt.button == 0) { // left click
      setAreaSelectionStart(undefined);
      setAreaSelectionEnd(undefined);
    } else if (event.evt.button == 1) { // middle click
      setOffsetStart(undefined);
    }
  }

  function onClickFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Add control point if: left click or right click without moving the mouse
    if (!(isAddingControl && (evt.button === 0 || evt.button === 2))) return;

    const posInPx = cc.getUnboundedPxFromEvent(event);
    if (posInPx === undefined) return;

    const cpInUOL = cc.toUOL(new EndPointControl(posInPx.x, posInPx.y, 0));

    // UX: Set target path to the first path if: no path is selected
    let targetPath: Path | undefined = props.app.selectedPath || paths[0];
    if (targetPath === undefined) {
      // UX: Create new path if: no path exists
      // UX: Use user mouse position as the last control point
      targetPath = new Path(props.app.format.buildSpeedConfig(), new Spline(new EndPointControl(0, 0, 0), [], cpInUOL));
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
    props.app.selected = [cpInUOL.uid];
  }

  const lineWidth = 1;
  const magnetInPx = cc.toPx(props.app.magnet);
  const visiblePaths = paths.filter((path) => path.visible);

  const knotRadius = cc.pixelWidth / 320;

  return (
    <Stage className='field-canvas' width={cc.pixelWidth} height={cc.pixelHeight}
      scale={new Vertex(scale, scale)} offset={offset}
      style={{ cursor: offsetStart ? 'grab' : '' }}
      onContextMenu={(e) => e.evt.preventDefault()}
      onWheel={action(onWheelCanvas)}
      onMouseDown={action(onMouseDownCanvas)}
      onMouseMove={action(onMouseMoveCanvas)}
      onMouseUp={action(onMouseUpCanvas)}>
      <Layer>
        <Image image={fieldImage} width={cc.pixelWidth} height={cc.pixelHeight}
          onClick={action(onClickFieldImage)}
          onMouseDown={action(onMouseDownFieldImage)} />
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
                path.cachedResult.knots.map((knotInUOL, index) => {
                  const sc = path.sc;

                  const speedFrom = sc.speedLimit.from;
                  const speedTo = sc.speedLimit.to;

                  const knotInPx = cc.toPx(knotInUOL);
                  const percentage = (knotInUOL.speed - speedFrom) / (speedTo - speedFrom);
                  // h => hue
                  // s => saturation
                  // l => lightness
                  const color = `hsl(${percentage * 90}, 70%, 50%)`; // red = min speed, green = max speed
                  return <Circle key={index} x={knotInPx.x} y={knotInPx.y} radius={knotRadius} fill={color} />
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
