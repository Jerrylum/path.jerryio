import React, { useEffect, useMemo, useRef, useState } from 'react';
import logo from './logo.svg';
import './App.css';

import { Spline, EdgeList, Vertex } from './math/path';
import { CanvasConfig, Circle, Shape, Text } from './math/shape';
import { Entity, SplineEntity } from './math/entity';

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

function handleInterfaceEvents(entityList: Entity[], eventName: string, pos: Vertex) {
  for (let entity of entityList) {
    if (eventName === "mouseDown") {
      if (entity.mouseDown(pos)) {
        break;
      }
    } else if (eventName === "mouseUp") {
      if (entity.mouseUp(pos)) {
        break;
      }
    } else if (eventName === "mouseHover") {
      if (entity.mouseHover(pos)) {
        break;
      }
    } else if (eventName === "mouseDrag") {
      if (entity.mouseDrag(pos)) {
        break;
      }
    }
  }
}

function App() {
  useTimer(1000);

  const edgeList = useMemo(() => new EdgeList(new Spline([new Vertex(-50, -50), new Vertex(-50, -50)])), []);

  const fieldCanvas = useRef<HTMLCanvasElement>(null);

  const [entityList,] = useState<Entity[]>([]);

  // const [shapeList,] = useState<Shape[]>([new Text("Hello", new Vertex(50, 50))]);


  // remove all shapes
  // while (shapeList.length > 0) {
  //   shapeList.pop();
  // }

  // for (let edge of edgeList.edges) {
  //   for (let knot of edge.calculateKnots()) {
  //     shapeList.push(new Circle(knot, 2, "black"));
  //   }

  // }


  // add mouse listener
  useEffect(() => {
    const canvas = fieldCanvas.current;

    if (canvas) {
      const ctx = fieldCanvas.current?.getContext('2d');

      if (ctx instanceof CanvasRenderingContext2D) {
        canvas.addEventListener('mousedown', (e) => {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const pos = new Vertex(x, y);
          handleInterfaceEvents(entityList, "mouseDown", pos);
        });
      }
    }
  }, [fieldCanvas.current]);

  //remove entity


  const canvas = fieldCanvas.current;

  if (canvas) {
    const ctx = fieldCanvas.current?.getContext('2d');

    if (ctx instanceof CanvasRenderingContext2D) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cc = new CanvasConfig(canvas.width, canvas.height, 365, 365);

      while (entityList.length > 0) {
        entityList.pop();
      }

      for (let edge of edgeList.edges) {
        if (edge instanceof Spline)
          entityList.push(new SplineEntity(cc, edge));
      }


      for (let entity of entityList) {
        entity.render(ctx);
      }
    }
  }


  return (
    <div className="App">
      <canvas id="fieldCanvas" className="fieldCanvas" ref={fieldCanvas} width="693" height="693"></canvas>
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
