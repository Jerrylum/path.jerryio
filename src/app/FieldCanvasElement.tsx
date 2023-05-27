import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { EndPointControl, Path, Spline } from '../math/Path';
import Konva from 'konva';
import { Circle, Image, Layer, Line, Stage } from 'react-konva';
import { SplineElement } from "./SplineElement";
import { AppProps } from "../App";
import React from "react";
import useImage from "use-image";

import fieldImageUrl from '../static/field2023.png'
import { SplineControlElement } from "./SplineControlElement";

const FieldCanvasElement = observer((props: AppProps) => {
  // useTimer(1000 / 30);

  const cc = props.cc;
  const paths = props.paths;

  const [fieldImage] = useImage(fieldImageUrl);

  function onClickFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    let targetPath: Path | undefined;
    if (props.app.selected.length !== 0) {
      // UX: Set target path to the first selected path if: some path is selected
      targetPath = paths.find((path) => props.app.isSelected(path.uid));
      // UX: Set target path to the first selected control point's path if: some control point is selected, the path visible and not locked
      if (targetPath === undefined) targetPath = paths.find((path) => path.getControlsSet().some((control) => props.app.isSelected(control.uid)));
    }
    // UX: Set target path to the first path if: no path is selected
    if (targetPath === undefined) targetPath = paths[0];

    let cpInUOL = cc.toUOL(new EndPointControl(evt.offsetX, evt.offsetY, 0));

    if (targetPath === undefined) {
      // UX: Create new path if: no path exists
      // UX: Use user mouse position as the last control point
      targetPath = new Path(new Spline(new EndPointControl(0, 0, 0), [], cpInUOL));
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

  const knotRadius = props.cc.pixelWidth / 320;

  const speedFrom = props.app.sc.speedLimit.from;
  const speedTo = props.app.sc.speedLimit.to;

  return (
    <Stage className='field-canvas' width={cc.pixelWidth} height={cc.pixelHeight} onContextMenu={(e) => e.evt.preventDefault()}>
      <Layer>
        <Image image={fieldImage} width={cc.pixelWidth} height={cc.pixelHeight} onClick={action(onClickFieldImage)} />
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
                path.calculateKnots(props.app.gc, props.app.sc).map((knotInUOL, index) => {
                  let knotInPx = props.cc.toPx(knotInUOL);

                  let percentage = (knotInUOL.speed - speedFrom) / (speedTo - speedFrom);
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
                  if (spline.isVisible()) return <SplineElement key={spline.uid} {...{ spline, path, ...props }} />
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
                    if (cp.visible) return <SplineControlElement key={cpIdx} {...{ spline, path, cp, ...props }} />;
                    else return null;
                  })
                )
              }
            </React.Fragment>
          ))
        }
      </Layer>
    </Stage>
  )
});

export { FieldCanvasElement };
