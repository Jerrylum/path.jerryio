import React, { useEffect, useMemo, useRef, useState } from 'react';
import logo from './logo.svg';
import './App.css';

import { Spline, EdgeList, Vertex } from './math/path';
import { Shape, Text } from './math/shape';

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

function App() {
  useTimer(1000);

  const edgeList = useMemo(() => new EdgeList(new Spline([new Vertex(0, 0), new Vertex(1, 1)])), []);

  const fieldCanvas = useRef<HTMLCanvasElement>(null);

  const [shapeList,] = useState<Shape[]>([new Text("Hello", new Vertex(50, 50))]);

  const ctx = fieldCanvas.current?.getContext('2d');

  if (ctx instanceof CanvasRenderingContext2D) {
    for (let shape of shapeList) {
      shape.render(ctx);

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
