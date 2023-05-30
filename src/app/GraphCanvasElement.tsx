import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { EndPointControl, KeyFrame, Knot, Path, Spline } from '../math/Path';
import Konva from 'konva';
import { Circle, Image, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { SplineElement } from "./SplineElement";
import { AppProps } from "../App";
import React from "react";
import { SpeedConfig } from "../format/Config";


export class GraphCanvasConverter {
  public knotsOnPage: number = 200;
  public knotWidth: number;
  public knotRadius: number;
  public lineWidth: number = 0.5;
  public twoSidePaddingWidth: number;
  public rightPaddingStart: number;
  public axisTitleWidth: number;
  public axisLineTopX: number;
  public bodyHeight: number;
  public axisLineBottomX: number;

  constructor(public pixelWidth: number, public pixelHeight: number, public zoom: number, public xOffset: number) {
    this.knotWidth = pixelWidth / this.knotsOnPage;
    this.knotRadius = this.knotWidth / 2;
    this.twoSidePaddingWidth = this.knotWidth * 14;
    this.rightPaddingStart = this.pixelWidth - this.twoSidePaddingWidth;
    this.axisTitleWidth = this.knotWidth * 10;
    this.axisLineTopX = this.pixelHeight * 0.2;
    this.bodyHeight = this.pixelHeight * 0.6;
    this.axisLineBottomX = this.pixelHeight * 0.8;
  }

  toPx(index: number): number {
    return (index) * this.knotWidth + this.knotWidth * 14 - this.xOffset;
  }
}

const KnotElement = observer((props: { knot: Knot, index: number, sc: SpeedConfig, gcc: GraphCanvasConverter }) => {
  const { knot, index, sc, gcc } = props;

  const speedFrom = sc.speedLimit.from;
  const speedTo = sc.speedLimit.to;

  const densityHigh = sc.applicationRange.to;
  const densityLow = sc.applicationRange.from;

  let p1 = (knot.delta - densityLow) / (densityHigh - densityLow);
  let p2 = (knot.speed - speedFrom) / (speedTo - speedFrom);
  let x = gcc.toPx(index);
  let y1 = (1 - p1) * (gcc.pixelHeight * 0.6) + (gcc.axisLineTopX);
  let y2 = (1 - p2) * (gcc.pixelHeight * 0.6) + (gcc.axisLineTopX);
  const color = `hsl(${p2 * 90}, 70%, 50%)`; // red = min speed, green = max speed

  return <>
    <Circle x={x} y={y1} radius={gcc.knotRadius} fill={"grey"} />
    <Circle x={x} y={y2} radius={gcc.knotRadius} fill={color} />
    {
      knot.isLastKnotOfSplines
        ? <Line points={[x, 0, x, gcc.pixelHeight]} stroke="grey" strokeWidth={gcc.lineWidth} />
        : null
    }
  </>
});

const GraphCanvasElement = observer((props: AppProps) => {
  const [zoom, setZoom] = React.useState(1);
  const [xOffset, setXOffset] = React.useState(0);

  const canvasWidth = window.innerHeight * 0.78;
  const canvasHeight = window.innerHeight * 0.12;
  const gcc = new GraphCanvasConverter(canvasWidth, canvasHeight, zoom, xOffset);

  const fontSize = canvasHeight / 8;

  const path = props.app.selectedPath || props.paths[0];

  const speedFrom = props.app.sc.speedLimit.from;
  const speedTo = props.app.sc.speedLimit.to;

  const densityHigh = props.app.sc.applicationRange.to;
  const densityLow = props.app.sc.applicationRange.from;

  const onGraphClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (path === undefined) return;

    const x = e.evt.offsetX;
    const y = e.evt.offsetY;

    const index = Math.floor((x + gcc.xOffset - gcc.twoSidePaddingWidth) / gcc.knotWidth);
    // get spline index by path.cachedSplineRanges
    const splineIndex = path.cachedSplineRanges.findIndex((range) => range.from <= index && range.to > index);

    if (splineIndex === -1) return;

    const range = path.cachedSplineRanges[splineIndex];
    const spline = path.splines[splineIndex];

    let xPos = (index - range.from) / (range.to - range.from);
    if (xPos === Infinity || xPos === -Infinity || isNaN(xPos)) return;

    let yPos = 1 - (y - gcc.axisLineTopX) / (gcc.axisLineBottomX - gcc.axisLineTopX);
    if (yPos === Infinity || yPos === -Infinity || isNaN(yPos)) return;
    if (yPos < 0) yPos = 0;
    if (yPos > 1) yPos = 1;

    // sort and push
    spline.speedProfiles.push(new KeyFrame(xPos, yPos, undefined));
    spline.speedProfiles.sort((a, b) => a.xPos - b.xPos);
  }

  const onDragKeyFrame = (e: Konva.KonvaEventObject<DragEvent>, keyFrame: KeyFrame, spline: Spline) => {

  };

  React.useEffect(() => {
    setXOffset(0);
  }, [path]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    const delta = e.evt.deltaY / 5;

    if (path === undefined) {
      setXOffset(0);
    } else {
      const maxScrollPos = gcc.knotWidth * (path.cachedKnots.length - 2);
      setXOffset((prev) => Math.min(Math.max(prev + delta, 0), maxScrollPos));
    }
  };

  return (
    <Stage width={canvasWidth} height={canvasHeight} onWheel={handleWheel}>
      <Layer>
        <Line points={[0, gcc.axisLineTopX, gcc.pixelWidth, gcc.axisLineTopX]} stroke="grey" strokeWidth={gcc.lineWidth} />
        <Line points={[0, gcc.axisLineBottomX, gcc.pixelWidth, gcc.axisLineBottomX]} stroke="grey" strokeWidth={gcc.lineWidth} />

        {
          path !== undefined
            ? path.cachedKnots.map((knot, index) => <KnotElement key={index} sc={props.app.sc} {...{ knot, index, gcc }} />)
            : null
        }

        <Rect x={0} y={0} width={gcc.twoSidePaddingWidth} height={gcc.pixelHeight} fill="white" />
        <Rect x={gcc.rightPaddingStart} y={0} width={gcc.twoSidePaddingWidth} height={gcc.pixelHeight} fill="white" />

        <Rect x={gcc.twoSidePaddingWidth} y={0} width={gcc.pixelWidth - gcc.twoSidePaddingWidth * 2} height={gcc.pixelHeight} onClick={action(onGraphClick)} />
        {
          path !== undefined
            ? path.cachedIndexWithKeyFrames.map((ikf) => {
              const x = gcc.toPx(ikf.index);
              const y = (1 - ikf.keyFrame.yPos) * gcc.bodyHeight + gcc.axisLineTopX;
              return <React.Fragment key={ikf.keyFrame.uid}>
                <Circle x={x} y={y} radius={gcc.knotRadius * 4} fill={"#D7B301"} opacity={0.75} />
              </React.Fragment>
            })
            : null
        }

        <Rect x={0} y={0} width={gcc.axisTitleWidth} height={gcc.pixelHeight} fill="white" />
        <Text text={speedTo + ""} x={0} y={gcc.axisLineTopX - fontSize / 3} fontSize={fontSize} fontFamily="Roboto" fill="#444" align="right" width={gcc.axisTitleWidth} />
        <Text text={speedFrom + ""} x={0} y={gcc.axisLineBottomX - fontSize / 3} fontSize={fontSize} fontFamily="Roboto" fill="#444" align="right" width={gcc.axisTitleWidth} />

        <Rect x={gcc.rightPaddingStart} y={0} width={gcc.twoSidePaddingWidth} height={gcc.pixelHeight} fill="white" />
        <Text text={densityHigh + ""} x={gcc.rightPaddingStart + gcc.knotWidth} y={gcc.axisLineTopX - fontSize / 3} fontSize={fontSize} fontFamily="Roboto" fill="#444" width={gcc.axisTitleWidth} />
        <Text text={densityLow + ""} x={gcc.rightPaddingStart + gcc.knotWidth} y={gcc.axisLineBottomX - fontSize / 3} fontSize={fontSize} fontFamily="Roboto" fill="#444" width={gcc.axisTitleWidth} />

        <Text text={"Speed"} x={0} y={gcc.pixelHeight} fontSize={fontSize} fontFamily="Roboto" fill="#444" width={gcc.pixelHeight} height={fontSize} align="center" rotation={270} />
        <Text text={"Density"} x={gcc.pixelWidth - gcc.knotWidth} y={0} fontSize={fontSize} fontFamily="Roboto" fill="#444" width={gcc.pixelHeight} height={fontSize} align="center" rotation={90} />

      </Layer>
    </Stage>
  );
});

export { GraphCanvasElement };
