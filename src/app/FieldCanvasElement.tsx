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

const FieldCanvasElement = observer((props: AppProps) => {
  // useTimer(1000 / 30);

  const uc = new UnitConverter(UnitOfLength.Foot, props.app.gc.uol);
  const canvasSizeInPx = window.innerHeight * 0.78;
  const canvasSizeInUOL = uc.fromAtoB(12);
  const cc = new CanvasConverter(canvasSizeInPx, canvasSizeInPx, canvasSizeInUOL, canvasSizeInUOL);

  const paths = props.paths;

  const [fieldImage] = useImage(fieldImageUrl);

  const [areaSelectionStart, setAreaSelectionStart] = React.useState<Vertex | undefined>(undefined);
  const [areaSelectionEnd, setAreaSelectionEnd] = React.useState<Vertex | undefined>(undefined);
  const [isAddingControl, setIsAddingControl] = React.useState(false);
  // const 

  function onMouseDownFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    setIsAddingControl(true);

    if (evt.button === 0) {

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

  function onMouseMoveCanvas(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    setIsAddingControl(false);

    if (evt.button === 0) { // left click
      // UX: Select control point if: left click

      const posInPx = cc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;

      if (areaSelectionStart !== undefined) {
        setAreaSelectionEnd(posInPx);
        props.app.updateAreaSelection(cc.toUOL(areaSelectionStart), cc.toUOL(posInPx));
      }
    }
  }

  function onMouseUpCanvas(event: Konva.KonvaEventObject<MouseEvent>) {
    setAreaSelectionStart(undefined);
    setAreaSelectionEnd(undefined);
  }

  function onClickFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Add control point if: left click or right click, except the mouse moved
    if (!isAddingControl) return;

    const cpInUOL = cc.toUOL(new EndPointControl(evt.offsetX, evt.offsetY, 0));

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
      if (evt.button === 2) { // right click
        // UX: Add straight line if: right click
        targetPath.addLine(cpInUOL);
      } else {
        // UX: Add 4-controls curve if: left click
        targetPath.add4ControlsCurve(cpInUOL);
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
    <Stage className='field-canvas' width={cc.pixelWidth} height={cc.pixelHeight} scale={new Vertex(1, 1)} offset={new Vertex(-100, -100)}
      onContextMenu={(e) => e.evt.preventDefault()}
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
                    if (cp.visible) return <SplineControlElement key={cpIdx} {...{ spline, path, cc, cp, ...props }} />;
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
