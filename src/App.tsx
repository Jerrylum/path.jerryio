import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

import { Spline, EdgeList, Vertex } from './math/path';
import { Entity, SplineEntity } from './math/entity';
import { CanvasConfig } from './math/shape';
import Konva from 'konva';
import { Circle, Layer, Rect, Stage, Image } from 'react-konva';

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

function SplineControlPointElement(props: { cp: Vertex, cc: CanvasConfig }) {
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
  let cp_in_px = props.cc.toPx(props.cp);

  return (
    <Circle x={cp_in_px.x} y={cp_in_px.y} radius={cp_radius} fill="#0000ff2f" draggable onDragMove={onDragControlPoint} />
  )
}

function SplineElement(props: { edge: Spline, edgeList: EdgeList, cc: CanvasConfig }) {
  let isFirst = props.edgeList.edges[0] === props.edge;

  let knot_radius = props.cc.pixelWidth / 320;

  return (
    <>
      {props.edge.calculateKnots(props.cc).map((knot_in_cm, index) => {
        let knot_in_px = props.cc.toPx(knot_in_cm);
        return (
          <Circle x={knot_in_px.x} y={knot_in_px.y} radius={knot_radius} fill="#00ff00ff" />
        )
      })}
      {props.edge.control_points.map((cp_in_cm, index) => {
        if (!isFirst && index === 0) return null;
        return (
          <SplineControlPointElement cp={cp_in_cm} cc={props.cc} />
        )
      })}
    </>
  )
}

function App() {
  useTimer(1000 / 30);

  const edgeList = useMemo(() => new EdgeList(new Spline([new Vertex(-60, -60), new Vertex(60, 60)])), []);

  const fieldCanvas = useRef<HTMLCanvasElement>(null);

  const [entityList,] = useState<Entity[]>([]);

  const [fieldImage] = useImage(fieldImageUrl);

  const cc = new CanvasConfig(window.innerHeight, window.innerHeight, 365.76, 365.76, 0.25);

  function onClickFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    let evt = event.evt;
    console.log("Clicked", evt.clientX, evt.clientY);
    edgeList.addLine(cc.toCm(new Vertex(evt.clientX, evt.clientY)));
  }

  return (
    <Stage width={cc.pixelWidth} height={cc.pixelHeight}>
      <Layer>
        <Image image={fieldImage} width={cc.pixelWidth} height={cc.pixelHeight} onClick={onClickFieldImage} />
        <Rect width={50} height={50} fill="red" />
        <Circle x={200} y={200} stroke="black" radius={50} />
        {edgeList.edges.map((edge) => {
          if (edge instanceof Spline) {
            return (
              <SplineElement edge={edge} edgeList={edgeList} cc={cc} />
            )
          } else {
            return null;
          }
        })}
      </Layer>
    </Stage>
  );
}

export default App;
