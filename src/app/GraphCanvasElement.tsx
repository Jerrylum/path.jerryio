import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { Point, Path, Vector } from "../core/Path";
import Konva from "konva";
import { Circle, Layer, Line, Rect, Stage, Text } from "react-konva";
import React from "react";
import { PathConfig } from "../format/Config";
import { clamp, useWindowSize } from "../core/Util";
import { AddKeyframe, MoveKeyframe, RemoveKeyframe, UpdateProperties } from "../core/Command";
import { useAppStores } from "../core/MainApp";
import { KeyframeIndexing } from "../core/Calculation";
import { GraphCanvasConverter } from "../core/Canvas";
import { Box, Tooltip } from "@mui/material";

const PathPoints = observer((props: { path: Path; gcc: GraphCanvasConverter }) => {
  const { path, gcc } = props;

  // ALGO: This is a separate component because it is expensive to render.

  return (
    <>
      {path.cachedResult.points.map((point, index) => (
        <PointElement key={index} pc={path.pc} {...{ point, index, gcc }} />
      ))}
    </>
  );
});

const Keyframes = observer((props: { path: Path; gcc: GraphCanvasConverter }) => {
  const { path, gcc } = props;

  return (
    <>
      {path.cachedResult.keyframeIndexes.map(ikf => (
        <KeyframeElement key={ikf.keyframe.uid} {...{ ikf, gcc }} />
      ))}
    </>
  );
});

const PointElement = observer((props: { point: Point; index: number; pc: PathConfig; gcc: GraphCanvasConverter }) => {
  const { point, index, pc, gcc } = props;

  const speedFrom = pc.speedLimit.from;
  const speedTo = pc.speedLimit.to;

  const bentRateHigh = pc.bentRateApplicableRange.to;
  const bentRateLow = pc.bentRateApplicableRange.from;

  let p1 = (point.bentRate - bentRateLow) / (bentRateHigh - bentRateLow);
  let p2 = (point.speed - speedFrom) / (speedTo - speedFrom);
  let x = gcc.toPxNumber(index);
  let y1 = (1 - p1) * (gcc.pixelHeight * 0.6) + gcc.axisLineTopX;
  let y2 = (1 - p2) * (gcc.pixelHeight * 0.6) + gcc.axisLineTopX;
  const color = `hsl(${p2 * 90}, 70%, 50%)`; // red = min speed, green = max speed

  return (
    <>
      {point.isLast && <Line points={[x, 0, x, gcc.pixelHeight]} stroke="grey" strokeWidth={gcc.lineWidth} />}
      <Circle x={x} y={y1} radius={gcc.pointRadius} fill={"grey"} />
      <Circle x={x} y={y2} radius={gcc.pointRadius} fill={color} />
    </>
  );
});

const KeyframeElement = observer((props: { ikf: KeyframeIndexing; gcc: GraphCanvasConverter }) => {
  const { app } = useAppStores();
  const { ikf, gcc } = props;

  const onDragKeyframe = (event: Konva.KonvaEventObject<DragEvent>) => {
    const evt = event.evt;

    let canvasPos = event.target.getStage()?.container().getBoundingClientRect();
    if (canvasPos === undefined) return;

    // UX: Calculate the position of the control point by the client mouse position
    // UX: Allow to drag the control point outside of the graph
    const kfPos = gcc.toPos(new Vector(evt.clientX - canvasPos.left, evt.clientY - canvasPos.top));
    if (kfPos === undefined) {
      evt.preventDefault();

      if (ikf.segment === undefined) return;
      const posInPx = gcc.toPx({ segment: ikf.segment, xPos: ikf.keyframe.xPos, yPos: ikf.keyframe.yPos });
      event.target.x(posInPx.x);
      event.target.y(posInPx.y);
      return;
    }

    app.history.execute(`Move keyframe ${ikf.keyframe.uid}`, new MoveKeyframe(gcc.path, kfPos, ikf.keyframe));

    const posInPx = gcc.toPx(kfPos);
    event.target.x(posInPx.x);
    event.target.y(posInPx.y);

    // TODO: Tooltip display
  };

  const onClickKeyframe = (event: Konva.KonvaEventObject<MouseEvent>) => {
    const evt = event.evt;

    if (evt.button === 0) {
      // left click
      const setTo = !ikf.keyframe.followBentRate;
      app.history.execute(
        `Update keyframe ${ikf.keyframe.uid} followCurve to ${setTo}`,
        new UpdateProperties(ikf.keyframe, { followBentRate: setTo }),
        0
      );
    } else if (evt.button === 2) {
      // right click
      app.history.execute(
        `Remove keyframe ${ikf.keyframe.uid} from path ${gcc.path.uid}`,
        new RemoveKeyframe(gcc.path, ikf.keyframe)
      );
    }
  };

  const x = gcc.toPxNumber(ikf.index);
  const y = (1 - ikf.keyframe.yPos) * gcc.bodyHeight + gcc.axisLineTopX;
  return (
    <Circle
      x={x}
      y={y}
      radius={gcc.pointRadius * 4}
      fill={"#D7B301"}
      opacity={0.75}
      draggable
      onDragMove={action(onDragKeyframe)}
      onClick={action(onClickKeyframe)}
      onMouseEnter={action(() => {})} // TODO
      onMouseMove={action(() => {})}
      onMouseLeave={action(() => {})}
    />
  );
});

const GraphCanvasElement = observer((props: {}) => {
  const { app, appPreferences: preferences } = useAppStores();

  const windowSize = useWindowSize();

  const [xOffset, setXOffset] = React.useState(0);

  const path = app.interestedPath();

  React.useEffect(() => {
    setXOffset(0);
  }, [path]);

  if (path === undefined) return null;

  const canvasWidth = windowSize.y * 0.78;
  const canvasHeight = windowSize.y * 0.12;
  const gcc = new GraphCanvasConverter(canvasWidth, canvasHeight, xOffset, path);

  const fontSize = canvasHeight / 8;
  const fgColor = preferences.theme.foregroundColor;
  const bgColor = preferences.theme.backgroundColor;

  const speedFrom = path.pc.speedLimit.from;
  const speedTo = path.pc.speedLimit.to;

  const bentRateHigh = path.pc.bentRateApplicableRange.to;
  const bentRateLow = path.pc.bentRateApplicableRange.from;

  const onGraphClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // UX: Allow to add keyframes only with left mouse button
    if (e.evt.button !== 0) return;

    if (path === undefined) return;

    const kfPos = gcc.toPos(new Vector(e.evt.offsetX, e.evt.offsetY));
    if (kfPos === undefined) return;

    app.history.execute(`Add speed keyframe to path ${path.uid}`, new AddKeyframe(path, kfPos));
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    const delta = e.evt.deltaY / 5;

    if (path === undefined) {
      setXOffset(0);
    } else {
      const maxScrollPos = gcc.pointWidth * (path.cachedResult.points.length - 2);
      setXOffset(prev => clamp(prev + delta, 0, maxScrollPos));
    }
  };

  return (
    <Tooltip title="" placement="right" arrow followCursor>
      <Box>
        <Stage
          width={canvasWidth}
          height={canvasHeight}
          onWheel={handleWheel}
          onContextMenu={e => e.evt.preventDefault()}>
          <Layer>
            <Line
              points={[0, gcc.axisLineTopX, gcc.pixelWidth, gcc.axisLineTopX]}
              stroke={fgColor}
              strokeWidth={gcc.lineWidth}
            />
            <Line
              points={[0, gcc.axisLineBottomX, gcc.pixelWidth, gcc.axisLineBottomX]}
              stroke={fgColor}
              strokeWidth={gcc.lineWidth}
            />

            <PathPoints {...{ path, gcc }} />

            <Rect x={0} y={0} width={gcc.twoSidePaddingWidth} height={gcc.pixelHeight} fill={bgColor} />
            <Rect
              x={gcc.rightPaddingStart}
              y={0}
              width={gcc.twoSidePaddingWidth}
              height={gcc.pixelHeight}
              fill={bgColor}
            />

            <Rect
              x={gcc.twoSidePaddingWidth}
              y={0}
              width={gcc.pixelWidth - gcc.twoSidePaddingWidth * 2}
              height={gcc.pixelHeight}
              onClick={action(onGraphClick)}
            />

            <Keyframes {...{ path, gcc }} />

            <Rect x={0} y={0} width={gcc.axisTitleWidth} height={gcc.pixelHeight} fill={bgColor} />
            <Text
              text={speedTo + ""}
              x={0}
              y={gcc.axisLineTopX - fontSize / 3}
              fontSize={fontSize}
              fontFamily="Roboto"
              fill={fgColor}
              align="right"
              width={gcc.axisTitleWidth * 0.9}
            />
            <Text
              text={speedFrom + ""}
              x={0}
              y={gcc.axisLineBottomX - fontSize / 3}
              fontSize={fontSize}
              fontFamily="Roboto"
              fill={fgColor}
              align="right"
              width={gcc.axisTitleWidth * 0.9}
            />

            <Rect
              x={gcc.rightPaddingStart}
              y={0}
              width={gcc.twoSidePaddingWidth}
              height={gcc.pixelHeight}
              fill={bgColor}
            />
            <Text
              text={bentRateHigh + ""}
              x={gcc.rightPaddingStart + gcc.pointWidth}
              y={gcc.axisLineTopX - fontSize / 3}
              fontSize={fontSize}
              fontFamily="Roboto"
              fill={fgColor}
              width={gcc.axisTitleWidth}
            />
            <Text
              text={bentRateLow + ""}
              x={gcc.rightPaddingStart + gcc.pointWidth}
              y={gcc.axisLineBottomX - fontSize / 3}
              fontSize={fontSize}
              fontFamily="Roboto"
              fill={fgColor}
              width={gcc.axisTitleWidth}
            />

            <Text
              text={"Speed"}
              x={0}
              y={gcc.pixelHeight}
              fontSize={fontSize}
              fontFamily="Roboto"
              fill={fgColor}
              width={gcc.pixelHeight}
              height={fontSize}
              align="center"
              rotation={270}
            />
            <Text
              text={"Bent Rate"}
              x={gcc.pixelWidth - gcc.pointWidth}
              y={0}
              fontSize={fontSize}
              fontFamily="Roboto"
              fill={fgColor}
              width={gcc.pixelHeight}
              height={fontSize}
              align="center"
              rotation={90}
            />
          </Layer>
        </Stage>
      </Box>
    </Tooltip>
  );
});

export { GraphCanvasElement };
