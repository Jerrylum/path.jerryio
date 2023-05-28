import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { EndPointControl, Path, Spline } from '../math/Path';
import Konva from 'konva';
import { Circle, Image, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { SplineElement } from "./SplineElement";
import { AppProps } from "../App";
import React from "react";


export class GraphCanvasConverter {
  public knotsOnPage: number = 200;
  public knotWidth: number;

  constructor(public pixelWidth: number, public pixelHeight: number, public zoom: number, public xOffset: number) {
    this.knotWidth = pixelWidth / this.knotsOnPage;
  }

  toPx(index: number): number {
    return (index) * this.knotWidth + this.knotWidth * 10 - this.xOffset;
  }
}

export interface SplineSplitProps extends AppProps {
  spline: Spline,
  gcc: GraphCanvasConverter,
  data: { idx: number }
}

const SplineSplitElement = observer((props: SplineSplitProps) => {
  const lineWidth = 1;

  const knots = props.spline.calculateKnots(props.app.gc, props.app.sc);

  const x1 = props.gcc.toPx(props.data.idx);
  const x2 = props.gcc.toPx(props.data.idx += knots.length - 1);

  console.log(x1, x2, props.data.idx);


  return (
    <>
      {
        props.data.idx === knots.length - 1
          ? <Line points={[x1, 0, x1, props.gcc.pixelHeight]} stroke="grey" strokeWidth={lineWidth} />
          : null
      }
      <Line points={[x2, 0, x2, props.gcc.pixelHeight]} stroke="grey" strokeWidth={lineWidth} />
    </>
  )
});

const GraphCanvasElement = observer((props: AppProps) => {
  const [zoom, setZoom] = React.useState(1);
  const [xOffset, setXOffset] = React.useState(0);

  const canvasWidth = window.innerHeight * 0.78;
  const canvasHeight = window.innerHeight * 0.12;
  const lineWidth = 0.5;
  const fontSize = canvasHeight / 8;

  const gcc = new GraphCanvasConverter(canvasWidth, canvasHeight, zoom, xOffset);

  const leftRightPaddingWidth = gcc.knotWidth * 12;
  const rightPaddingStart = gcc.pixelWidth - leftRightPaddingWidth;
  const axisLabelWidth = gcc.knotWidth * 10;
  const axisLineTop = gcc.pixelHeight * 0.2;
  const axisLineBottom = gcc.pixelHeight * 0.8;

  const path = props.app.selectedPath || props.paths[0];
  const splines = path?.splines || [];

  const speedFrom = props.app.sc.speedLimit.from;
  const speedTo = props.app.sc.speedLimit.to;

  const densityHigh = props.app.sc.applicationRange.to;
  const densityLow = props.app.sc.applicationRange.from;

  const knotRadius = gcc.knotWidth / 2;

  const data = {
    idx: 0
  }

  React.useEffect(() => {
    setXOffset(0);
  }, [path]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    const delta = e.evt.deltaY / 5;

    if (path === undefined) {
      setXOffset(0);
    } else {
      const maxScrollPos = gcc.knotWidth * (path.cachedKnots.length - 5);     
      setXOffset((prev) => Math.min(Math.max(prev + delta, 0), maxScrollPos));
    }
  };

  return (
    <Stage width={canvasWidth} height={canvasHeight} onWheel={handleWheel}>
      <Layer>
        {
          // splines.map((spline) => {
          //   return <SplineSplitElement gcc={gcc} data={data} spline={spline} key={spline.uid} {...props} />
          // })
        }


        {
          path !== undefined
            ? path.cachedKnots.map((knot, index) => {

              let percentage = (knot.delta - densityLow) / (densityHigh - densityLow);
              let x2 = gcc.toPx(index);
              let y2 = (1 - percentage) * (gcc.pixelHeight * 0.6) + (axisLineTop);

              return <React.Fragment key={index}>
                <Circle x={x2} y={y2} radius={knotRadius} fill={"grey"} />
              </React.Fragment>
            })
            : null
        }
        {
          path !== undefined
            ? path.cachedKnots.map((knot, index) => {

              let percentage = (knot.speed - speedFrom) / (speedTo - speedFrom);
              let x2 = gcc.toPx(index);
              let y2 = (1 - percentage) * (gcc.pixelHeight * 0.6) + (axisLineTop);
              const color = `hsl(${percentage * 90}, 70%, 50%)`; // red = min speed, green = max speed
              return <React.Fragment key={index}>
                <Circle x={x2} y={y2} radius={knotRadius} fill={color} />
                {
                  knot.heading !== undefined
                    ? <Line points={[x2, 0, x2, gcc.pixelHeight]} stroke="grey" strokeWidth={lineWidth} />
                    : null
                }
              </React.Fragment>
            })
            : null
        }

        <Line points={[0, axisLineTop, gcc.pixelWidth, axisLineTop]} stroke="grey" strokeWidth={lineWidth} />
        <Line points={[0, axisLineBottom, gcc.pixelWidth, axisLineBottom]} stroke="grey" strokeWidth={lineWidth} />


        <Rect x={0} y={0} width={leftRightPaddingWidth} height={gcc.pixelHeight} fill="white" />
        <Text text={speedTo + ""} x={0} y={axisLineTop - fontSize / 3} fontSize={fontSize} fontFamily="Roboto" fill="#444" align="right" width={axisLabelWidth} />
        <Text text={speedFrom + ""} x={0} y={axisLineBottom - fontSize / 3} fontSize={fontSize} fontFamily="Roboto" fill="#444" align="right" width={axisLabelWidth} />

        <Rect x={rightPaddingStart} y={0} width={leftRightPaddingWidth} height={gcc.pixelHeight} fill="white" />
        <Text text={densityHigh + ""} x={rightPaddingStart + gcc.knotWidth} y={axisLineTop - fontSize / 3} fontSize={fontSize} fontFamily="Roboto" fill="#444" width={axisLabelWidth} />
        <Text text={densityLow + ""} x={rightPaddingStart + gcc.knotWidth} y={axisLineBottom - fontSize / 3} fontSize={fontSize} fontFamily="Roboto" fill="#444" width={axisLabelWidth} />

        <Text text={"Speed"} x={0} y={gcc.pixelHeight} fontSize={fontSize} fontFamily="Roboto" fill="#444" width={gcc.pixelHeight} height={fontSize} align="center" rotation={270} />
        <Text text={"Density"} x={gcc.pixelWidth - gcc.knotWidth} y={0} fontSize={fontSize} fontFamily="Roboto" fill="#444" width={gcc.pixelHeight} height={fontSize} align="center" rotation={90} />

      </Layer>
    </Stage>
  );
});

export { GraphCanvasElement };
