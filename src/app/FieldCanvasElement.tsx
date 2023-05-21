import { runInAction, makeAutoObservable } from "mobx"
import { observer } from "mobx-react-lite";
import { Control, EndPointControl, Path, Spline, Vertex } from '../math/path';
import { CanvasConfig } from '../math/shape';
import Konva from 'konva';
import { Circle, Image, Layer, Line, Stage } from 'react-konva';
import { useState } from "react";
import { SplineElement, SplineElementProps } from "./SplineElement";
import { AppProps } from "../App";
import React from "react";
import useImage from "use-image";

import fieldImageUrl from '../static/field2023.png'

const FieldCanvasElement = observer((props: AppProps) => {
  // useTimer(1000 / 30);

  const cc = props.cc;
  const paths = props.paths;

  const [fieldImage] = useImage(fieldImageUrl);

  function onClickFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    let targetPath: Path | undefined;
    if (props.selected.length !== 0) {
      targetPath = paths.find((path) => props.selected.includes(path.uid));
      if (targetPath === undefined) targetPath = paths.find((path) => path.getControlsSet().some((control) => props.selected.includes(control.uid)));
    }
    if (targetPath === undefined) targetPath = paths[0];


    let cpInCm = cc.toCm(new EndPointControl(evt.offsetX, evt.offsetY, 0));

    if (targetPath === undefined) {
      targetPath = new Path(new Spline(new EndPointControl(0, 0, 0), [], cpInCm));
      paths.push(targetPath);
    } else {
      if (evt.button === 2) { // click
        targetPath.addLine(cpInCm);
      } else {
        targetPath.add4ControlsCurve(cpInCm);
      }
    }

  }

  const lineWidth = 1;
  const magnetInPx = cc.toPx(props.magnet);

  return (
    <Stage className='field-canvas' width={cc.pixelWidth} height={cc.pixelHeight} onContextMenu={(e) => e.evt.preventDefault()}>
      <Layer>
        <Image image={fieldImage} width={cc.pixelWidth} height={cc.pixelHeight} onClick={onClickFieldImage} />
        {
          props.magnet.x !== Infinity ? (
            <Line points={[magnetInPx.x, 0, magnetInPx.x, cc.pixelHeight]} stroke="red" strokeWidth={lineWidth} />
          ) : null
        }
        {
          props.magnet.y !== Infinity ? (
            <Line points={[0, magnetInPx.y, cc.pixelHeight, magnetInPx.y]} stroke="red" strokeWidth={lineWidth} />
          ) : null
        }
        {
          paths.map((path, index) => path.visible
            ? (
              <React.Fragment key={index}>
                {path.splines.map((spline) => spline.isVisible() ? <SplineElement key={spline.uid} {...{ spline, path, ...props }} /> : null)}
              </React.Fragment>
            )
            : null)
        }
      </Layer>
    </Stage>
  )
});

export { FieldCanvasElement };
