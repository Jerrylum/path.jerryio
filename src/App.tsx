import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

import { Control, EndPointControl, Spline, SplineList, Vertex } from './math/path';
import { CanvasConfig } from './math/shape';
import Konva from 'konva';
import { Circle, Layer, Rect, Stage, Image, Line } from 'react-konva';

import fieldImageUrl from './static/field2023.png'
import useImage from 'use-image';

function useTimer(ms: number) {
  const [time, setTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), ms);
    return () => {
      clearInterval(interval);
    };
  }, [ms]);

  return time;
}

function SplineControlPointVisualLineElement(props: { start: Vertex, end: Vertex, cc: CanvasConfig }) {
  const start_in_px = props.cc.toPx(props.start);
  const end_in_px = props.cc.toPx(props.end);

  const line_width = props.cc.pixelWidth / 600;

  return (
    <Line points={[start_in_px.x, start_in_px.y, end_in_px.x, end_in_px.y]} stroke="ffffff" strokeWidth={line_width} opacity={0.25} />
  )
}

function SplineKnotsHitBoxElement(props: { spline: Spline, splineList: SplineList, cc: CanvasConfig }) {
  function onLineClick(event: Konva.KonvaEventObject<MouseEvent>) {
    let evt = event.evt;

    let cpInPx = new EndPointControl(evt.clientX, evt.clientY, 0);
    let cpInCm = props.cc.toCm(cpInPx);

    if (evt.button === 2) { // click
      props.splineList.splitSpline(props.spline, cpInCm);
    } else {
      if (props.spline.control_points.length === 2)
        props.splineList.changeToCurve(props.spline);
      else
        props.splineList.changeToLine(props.spline);
    }
  }

  let points: number[] = [];

  for (let v of props.spline.control_points) {
    let v_in_px = props.cc.toPx(v);
    points.push(v_in_px.x);
    points.push(v_in_px.y);
  }

  const knot_width = props.cc.pixelWidth / 320 * 2.5;

  return (
    <Line points={points} strokeWidth={knot_width} stroke={"red"} opacity={0} bezier={props.spline.control_points.length > 2} onClick={onLineClick} />
  )
}

function SplineControlPointElement(props: { cp: Control, spline: Spline, splineList: SplineList, cc: CanvasConfig, isFirstOrLast: boolean }) {
  function onDragControlPoint(event: Konva.KonvaEventObject<DragEvent>) {
    let evt = event.evt;

    event.target.x(evt.clientX);
    event.target.y(evt.clientY);

    let cpInPx = new Vertex(evt.clientX, evt.clientY);
    let cpInCm = props.cc.toCm(cpInPx);
    props.cp.x = cpInCm.x;
    props.cp.y = cpInCm.y;
  }

  function onWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    let evt = event.evt;

    let epc = props.cp as EndPointControl;
    epc.heading += evt.deltaY / 10;
    epc.heading %= 360;
    if (epc.heading < 0) epc.heading += 360;
  }

  const line_width = props.cc.pixelWidth / 600;
  const cp_radius = props.cc.pixelWidth / 40;
  const cp_in_px = props.cc.toPx(props.cp);

  function onClickFirstOrLastControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    let evt = event.evt;

    if (evt.button === 2) { // right click
      props.splineList.removeSplineByFirstOrLastControlPoint(props.cp as EndPointControl);
    }
  }

  return (
    <>
      {
        props.isFirstOrLast ? (
          <>
            <Line points={[
              cp_in_px.x, cp_in_px.y,
              cp_in_px.x + Math.sin(-((cp_in_px as EndPointControl).headingInRadian() - Math.PI)) * cp_radius,
              cp_in_px.y + Math.cos(-((cp_in_px as EndPointControl).headingInRadian() - Math.PI)) * cp_radius
            ]} stroke="ffffff" strokeWidth={line_width} />
            <Circle x={cp_in_px.x} y={cp_in_px.y} radius={props.isFirstOrLast ? cp_radius : cp_radius / 2} fill="#0000ff2f"
              draggable onDragMove={onDragControlPoint} onWheel={onWheel} onClick={onClickFirstOrLastControlPoint} />
          </>
        ) : (
          <Circle x={cp_in_px.x} y={cp_in_px.y} radius={props.isFirstOrLast ? cp_radius : cp_radius / 2} fill="#0000ff2f"
            draggable onDragMove={onDragControlPoint} />
        )
      }

    </>
  )
}

function SplineElement(props: { spline: Spline, splineList: SplineList, cc: CanvasConfig }) {
  let isFirst = props.splineList.splines[0] === props.spline;

  let knot_radius = props.cc.pixelWidth / 320;

  return (
    <>
      {props.spline.calculateKnots(props.cc).map((knot_in_cm, index) => {
        let knot_in_px = props.cc.toPx(knot_in_cm);
        return (
          <Circle x={knot_in_px.x} y={knot_in_px.y} radius={knot_radius} fill="#00ff00ff" />
        )
      })}
      {
        props.spline.control_points.length === 4 ? (
          <>
            <SplineControlPointVisualLineElement start={props.spline.control_points[0]} end={props.spline.control_points[1]} cc={props.cc} />
            <SplineControlPointVisualLineElement start={props.spline.control_points[2]} end={props.spline.control_points[3]} cc={props.cc} />
          </>
        ) : null
      }
      <SplineKnotsHitBoxElement spline={props.spline} splineList={props.splineList} cc={props.cc} />
      {props.spline.control_points.map((cp_in_cm, index) => {
        if (!isFirst && index === 0) return null;
        return (
          <SplineControlPointElement cp={cp_in_cm} spline={props.spline} splineList={props.splineList} cc={props.cc}
            isFirstOrLast={cp_in_cm === props.spline.first() || cp_in_cm === props.spline.last()} />
        )
      })}
    </>
  )
}

function App() {
  useTimer(1000 / 30);

  const splineList = useMemo(() => new SplineList(new Spline(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0))), []);

  const fieldCanvas = useRef<HTMLCanvasElement>(null);

  const [fieldImage] = useImage(fieldImageUrl);

  const cc = new CanvasConfig(window.innerHeight, window.innerHeight, 365.76, 365.76, 0.25);

  function onClickFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    let evt = event.evt;

    if (evt.button === 2) { // click
      splineList.addLine(cc.toCm(new EndPointControl(evt.clientX, evt.clientY, 0)));
    } else {
      splineList.add4PointsSpline(cc.toCm(new EndPointControl(evt.clientX, evt.clientY, 0)));
    }
  }

  return (
    <Stage width={cc.pixelWidth} height={cc.pixelHeight} onContextMenu={(e) => e.evt.preventDefault()}>
      <Layer>
        <Image image={fieldImage} width={cc.pixelWidth} height={cc.pixelHeight} onClick={onClickFieldImage} />
        {splineList.splines.map((spline) => {
          return (
            <SplineElement key={spline.uid} spline={spline} splineList={splineList} cc={cc} />
          )
        })}
      </Layer>
    </Stage>
  );
}

export default App;
