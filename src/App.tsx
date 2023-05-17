import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

import { Spline, SplineList, Vertex } from './math/path';
import { Entity, SplineEntity } from './math/entity';
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

function SplineControlPointVisualLineElement(props: {start: Vertex, end: Vertex, cc: CanvasConfig}) {
  const start_in_px = props.cc.toPx(props.start);
  const end_in_px = props.cc.toPx(props.end);
  
  const cp_radius = props.cc.pixelWidth / 600;

  return (
    <Line points={[start_in_px.x, start_in_px.y, end_in_px.x, end_in_px.y]} stroke="ffffff" strokeWidth={cp_radius} opacity={0.25} />
  )
}

function SplineKnotsHitBoxElement(props: { spline: Spline, splineList: SplineList, cc: CanvasConfig }) {
  let points = props.spline.calculateKnots(props.cc).map((knot_in_cm, index) => {
    let knot_in_px = props.cc.toPx(knot_in_cm);
    return [knot_in_px.x, knot_in_px.y];
  }).reduce((a, b) => a.concat(b), []);;

  let knot_width = props.cc.pixelWidth / 320 * 2;

  return (
    <Line points={points} strokeWidth={knot_width} opacity={0} />
  )
}

function SplineControlPointElement(props: { cp: Vertex, splineList: SplineList, cc: CanvasConfig, isFirstOrLast: boolean }) {
  function onDragControlPoint(event: Konva.KonvaEventObject<DragEvent>) {
    let evt = event.evt;

    event.target.x(evt.clientX);
    event.target.y(evt.clientY);

    let cpInPx = new Vertex(evt.clientX, evt.clientY);
    let cpInCm = props.cc.toCm(cpInPx);
    props.cp.x = cpInCm.x;
    props.cp.y = cpInCm.y;
  }

  const cp_radius = props.cc.pixelWidth / 40;
  const cp_in_px = props.cc.toPx(props.cp);

  function onClickFirstOrLastControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    let evt = event.evt;
    // console.log("Clicked", evt.clientX, evt.clientY);

    if (evt.button === 2) { // click
      props.splineList.removeSplineByFirstOrLastControlPoint(props.cp);
    }
  }

  return (
    <Circle x={cp_in_px.x} y={cp_in_px.y} radius={props.isFirstOrLast ? cp_radius : cp_radius / 2} fill="#0000ff2f"
      draggable onDragMove={onDragControlPoint}
      {...(props.isFirstOrLast ? { onClick: onClickFirstOrLastControlPoint } : {})} />
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
          <SplineControlPointElement cp={cp_in_cm} splineList={props.splineList} cc={props.cc}
            isFirstOrLast={cp_in_cm === props.spline.first() || cp_in_cm === props.spline.last()} />
        )
      })}
    </>
  )
}

function App() {
  useTimer(1000 / 30);

  const splineList = useMemo(() => new SplineList(new Spline([new Vertex(-60, -60), new Vertex(60, 60)])), []);

  const fieldCanvas = useRef<HTMLCanvasElement>(null);

  const [entityList,] = useState<Entity[]>([]);

  const [fieldImage] = useImage(fieldImageUrl);

  const cc = new CanvasConfig(window.innerHeight, window.innerHeight, 365.76, 365.76, 0.25);

  function onClickFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    let evt = event.evt;
    // console.log("Clicked", evt.clientX, evt.clientY);

    if (event.evt.button === 2) { // click
      splineList.addLine(cc.toCm(new Vertex(evt.clientX, evt.clientY)));
    } else {
      splineList.add4PointsSpline(cc.toCm(new Vertex(evt.clientX, evt.clientY)));
    }
  }

  return (
    <Stage width={cc.pixelWidth} height={cc.pixelHeight} onContextMenu={(e) => e.evt.preventDefault()}>
      <Layer>
        <Image image={fieldImage} width={cc.pixelWidth} height={cc.pixelHeight} onClick={onClickFieldImage} />
        {/* <Rect width={50} height={50} fill="red" />
        <Circle x={200} y={200} stroke="black" radius={50} /> */}
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
