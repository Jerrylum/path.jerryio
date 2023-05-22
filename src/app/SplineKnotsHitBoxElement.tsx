import { observer } from "mobx-react-lite";
import { EndPointControl } from '../math/path';
import Konva from 'konva';
import { Line } from 'react-konva';
import { SplineElementProps } from "./SplineElement";

const SplineKnotsHitBoxElement = observer((props: SplineElementProps) => {
  function onLineClick(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Do not interact with spline if any of its control points or the path is locked
    const isLocked = props.spline.isLocked() || props.path.lock;
    if (isLocked) {
      evt.preventDefault();
      return;
    }

    let cpInPx = new EndPointControl(evt.offsetX, evt.offsetY, 0);
    let cpInUOL = props.cc.toUOL(cpInPx);

    if (evt.button === 2) { // right click
      // UX: Split spline if: right click
      props.path.splitSpline(props.spline, cpInUOL);
    } else if (evt.button === 0) {
      // UX: Convert spline if: left click
      if (props.spline.controls.length === 2)
        props.path.convertTo4ControlsCurve(props.spline);
      else
        props.path.convertToLine(props.spline);
    }
  }

  let points: number[] = [];

  for (let cp of props.spline.controls) {
    let cpInPx = props.cc.toPx(cp);
    points.push(cpInPx.x);
    points.push(cpInPx.y);
  }

  const knotWidth = props.cc.pixelWidth / 320 * 8;

  return (
    <Line points={points} strokeWidth={knotWidth} stroke={"red"} opacity={0} bezier={props.spline.controls.length > 2} onClick={onLineClick} />
  )
});

export { SplineKnotsHitBoxElement };
