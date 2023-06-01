import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { KeyFrameIndexing, KeyFrame, KeyFramePos, Knot, Path, Vertex } from '../math/Path';
import Konva from 'konva';
import { Circle, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { AppProps } from "../App";
import React from "react";
import { SpeedConfig } from "../format/Config";
import { clamp } from "./Util";


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

  constructor(public pixelWidth: number, public pixelHeight: number,
    public xOffset: number,
    public path: Path) {
    this.knotWidth = pixelWidth / this.knotsOnPage;
    this.knotRadius = this.knotWidth / 2;
    this.twoSidePaddingWidth = this.knotWidth * 14;
    this.rightPaddingStart = this.pixelWidth - this.twoSidePaddingWidth;
    this.axisTitleWidth = this.knotWidth * 10;
    this.axisLineTopX = this.pixelHeight * 0.2;
    this.bodyHeight = this.pixelHeight * 0.6;
    this.axisLineBottomX = this.pixelHeight * 0.8;
  }

  toPxNumber(index: number): number {
    return (index) * this.knotWidth + this.knotWidth * 14 - this.xOffset;
  }

  toIndexNumber(px: number): number {
    return Math.floor((px + this.xOffset - this.twoSidePaddingWidth) / this.knotWidth);
  }

  toPos(px: Vertex): KeyFramePos | undefined {
    const x = px.x;
    const y = px.y;

    let index = this.toIndexNumber(x);
    if (index >= this.path.cachedResult.knots.length - 2) {
      index = this.path.cachedResult.knots.length - 2;
    }
    if (index < 0) {
      index = 0;
    }

    const splineIndex = this.path.cachedResult.splineRanges.findIndex((range) => range.from <= index && range.to > index);
    if (splineIndex === -1) return;

    const range = this.path.cachedResult.splineRanges[splineIndex];
    const spline = this.path.splines[splineIndex];

    let xPos = (index - range.from) / (range.to - range.from);
    if (xPos === Infinity || xPos === -Infinity || isNaN(xPos)) return;

    let yPos = 1 - (y - this.axisLineTopX) / (this.axisLineBottomX - this.axisLineTopX);
    if (yPos === Infinity || yPos === -Infinity || isNaN(yPos)) return;
    if (yPos < 0) yPos = 0;
    if (yPos > 1) yPos = 1;

    return { spline, xPos, yPos };
  }

  toPx(pos: KeyFramePos): Vertex {
    const spline = pos.spline;
    const splineIndex = this.path.splines.findIndex((s) => s === spline);
    const range = this.path.cachedResult.splineRanges[splineIndex];

    const x = range.from + pos.xPos * (range.to - range.from);
    const y = this.axisLineTopX + (1 - pos.yPos) * (this.axisLineBottomX - this.axisLineTopX);

    return new Vertex(this.toPxNumber(x), y);
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
  let x = gcc.toPxNumber(index);
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

const KeyFrameElement = observer((props: { ikf: KeyFrameIndexing, gcc: GraphCanvasConverter }) => {
  const { ikf, gcc } = props;

  const onDragKeyFrame = (event: Konva.KonvaEventObject<DragEvent>) => {
    const evt = event.evt;

    let canvasPos = event.target.getStage()?.container().getBoundingClientRect();
    if (canvasPos === undefined) return;

    // UX: Calculate the position of the control point by the client mouse position
    // UX: Allow to drag the control point outside of the graph
    const kfPos = gcc.toPos(new Vertex(evt.clientX - canvasPos.left, evt.clientY - canvasPos.top));
    if (kfPos === undefined) {
      evt.preventDefault();

      if (ikf.spline === undefined) return;
      const posInPx = gcc.toPx({ spline: ikf.spline, xPos: ikf.keyFrame.xPos, yPos: ikf.keyFrame.yPos });
      event.target.x(posInPx.x);
      event.target.y(posInPx.y);
      return;
    }

    // ALGO: Assume path is not undefined
    // remove keyframe from oldSpline speed control
    for (const spline of gcc.path.splines) {
      spline.speedProfiles = spline.speedProfiles.filter((kf) => kf !== ikf.keyFrame);
    }

    const kf = ikf.keyFrame;
    kf.xPos = kfPos.xPos;
    kf.yPos = kfPos.yPos;
    kfPos.spline.speedProfiles.push(kf);
    kfPos.spline.speedProfiles.sort((a, b) => a.xPos - b.xPos);

    const posInPx = gcc.toPx(kfPos);
    event.target.x(posInPx.x);
    event.target.y(posInPx.y);
  };

  const onClickKeyFrame = (event: Konva.KonvaEventObject<MouseEvent>) => {
    const evt = event.evt;

    if (evt.button === 0) { // left click
      ikf.keyFrame.followCurve = !ikf.keyFrame.followCurve;
    } else if (evt.button === 2) { // right click
      for (const spline of gcc.path.splines) {
        spline.speedProfiles = spline.speedProfiles.filter((kf) => kf !== ikf.keyFrame);
      }
    }
  };

  const x = gcc.toPxNumber(ikf.index);
  const y = (1 - ikf.keyFrame.yPos) * gcc.bodyHeight + gcc.axisLineTopX;
  return (
    <Circle x={x} y={y} radius={gcc.knotRadius * 4} fill={"#D7B301"} opacity={0.75} draggable
      onDragMove={action(onDragKeyFrame)} onClick={action(onClickKeyFrame)} />
  );
});

const GraphCanvasElement = observer((props: AppProps) => {
  const [xOffset, setXOffset] = React.useState(0);

  const path = props.app.selectedPath || props.paths[0];

  React.useEffect(() => {
    setXOffset(0);
  }, [path]);

  if (path === undefined) return null;

  const canvasWidth = window.innerHeight * 0.78;
  const canvasHeight = window.innerHeight * 0.12;
  const gcc = new GraphCanvasConverter(canvasWidth, canvasHeight, xOffset, path);

  const fontSize = canvasHeight / 8;

  const speedFrom = path.sc.speedLimit.from;
  const speedTo = path.sc.speedLimit.to;

  const densityHigh = path.sc.applicationRange.to;
  const densityLow = path.sc.applicationRange.from;

  const onGraphClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // UX: Allow to add keyframes only with left mouse button
    if (e.evt.button !== 0) return;

    if (path === undefined) return;

    const kfPos = gcc.toPos(new Vertex(e.evt.offsetX, e.evt.offsetY));
    if (kfPos === undefined) return;

    // sort and push
    kfPos.spline.speedProfiles.push(new KeyFrame(kfPos.xPos, kfPos.yPos));
    kfPos.spline.speedProfiles.sort((a, b) => a.xPos - b.xPos);
  }


  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    const delta = e.evt.deltaY / 5;

    if (path === undefined) {
      setXOffset(0);
    } else {
      const maxScrollPos = gcc.knotWidth * (path.cachedResult.knots.length - 2);
      setXOffset((prev) => clamp(prev + delta, 0, maxScrollPos));
    }
  };

  return (
    <Stage width={canvasWidth} height={canvasHeight} onWheel={handleWheel} onContextMenu={(e) => e.evt.preventDefault()}>
      <Layer>
        <Line points={[0, gcc.axisLineTopX, gcc.pixelWidth, gcc.axisLineTopX]} stroke="grey" strokeWidth={gcc.lineWidth} />
        <Line points={[0, gcc.axisLineBottomX, gcc.pixelWidth, gcc.axisLineBottomX]} stroke="grey" strokeWidth={gcc.lineWidth} />

        {
          path?.cachedResult.knots.map((knot, index) => <KnotElement key={index} sc={path.sc} {...{ knot, index, gcc }} />)
        }

        <Rect x={0} y={0} width={gcc.twoSidePaddingWidth} height={gcc.pixelHeight} fill="white" />
        <Rect x={gcc.rightPaddingStart} y={0} width={gcc.twoSidePaddingWidth} height={gcc.pixelHeight} fill="white" />

        <Rect x={gcc.twoSidePaddingWidth} y={0} width={gcc.pixelWidth - gcc.twoSidePaddingWidth * 2} height={gcc.pixelHeight} onClick={action(onGraphClick)} />
        {
          path?.cachedResult.keyframeIndexes.map((ikf) => <KeyFrameElement key={ikf.keyFrame.uid} {...{ ikf, gcc }} />)
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
