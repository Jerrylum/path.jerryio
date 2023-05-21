import { runInAction, makeAutoObservable } from "mobx"
import { observer } from "mobx-react-lite";
import { EndPointControl, Vertex } from '../math/path';
import { CanvasConfig } from '../math/shape';
import Konva from 'konva';
import { Line } from 'react-konva';
import { SplineElementProps } from "./SplineElement";

export function SplineKnotsHitBoxElement(props: SplineElementProps) {
    function onLineClick(event: Konva.KonvaEventObject<MouseEvent>) {
      const evt = event.evt;
  
      const isLocked = props.spline.isLocked() || props.path.lock;
      if (isLocked) {
        evt.preventDefault();
        return;
      }
  
      let cpInPx = new EndPointControl(evt.offsetX, evt.offsetY, 0);
      let cpInCm = props.cc.toCm(cpInPx);
  
      if (evt.button === 2) { // click
        props.path.splitSpline(props.spline, cpInCm);
      } else {
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
  
    const knotWidth = props.cc.pixelWidth / 320 * 2.5;
  
    return (
      <Line points={points} strokeWidth={knotWidth} stroke={"red"} opacity={0} bezier={props.spline.controls.length > 2} onClick={onLineClick} />
    )
  }
