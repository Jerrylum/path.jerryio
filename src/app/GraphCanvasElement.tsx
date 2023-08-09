import { makeAutoObservable, action } from "mobx";
import { observer } from "mobx-react-lite";
import { Point, Path, Vector, KeyframePos } from "../core/Path";
import Konva from "konva";
import { Circle, Layer, Line, Rect, Stage, Text } from "react-konva";
import React from "react";
import { PathConfig } from "../format/Config";
import { clamp } from "../core/Util";
import { AddKeyframe, MoveKeyframe, RemoveKeyframe, UpdateProperties } from "../core/Command";
import { getAppStores } from "../core/MainApp";
import { KeyframeIndexing } from "../core/Calculation";
import { GraphCanvasConverter } from "../core/Canvas";
import { Box, Tooltip } from "@mui/material";
import { Instance } from "@popperjs/core";
import { useWindowSize } from "../core/Hook";
import { LayoutType } from "./Layout";
import { themes } from "./Theme";

function showTooltip(variables: GraphCanvasVariables, ikf: KeyframeIndexing | undefined) {
  if (ikf === undefined) {
    variables.tooltip = undefined;
  } else if (ikf.segment) {
    variables.tooltip = {
      pos: { segment: ikf.segment, xPos: ikf.keyframe.xPos, yPos: ikf.keyframe.yPos },
      speed: ikf.keyframe.yPos
    };
  }
}

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

const Keyframes = observer((props: { path: Path; gcc: GraphCanvasConverter; variables: GraphCanvasVariables }) => {
  const { path, gcc, variables } = props;

  return (
    <>
      {path.cachedResult.keyframeIndexes.map(ikf => (
        <KeyframeElement key={ikf.keyframe.uid} {...{ ikf, gcc, variables }} />
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

  let p1 = (point.bentRate - bentRateLow) / (bentRateHigh - bentRateLow || 1);
  let p2 = (point.speed - speedFrom) / (speedTo - speedFrom || 1);
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

interface KeyframeElementProps {
  ikf: KeyframeIndexing;
  gcc: GraphCanvasConverter;
  variables: GraphCanvasVariables;
}

const KeyframeElement = observer((props: KeyframeElementProps) => {
  const { app } = getAppStores();
  const { ikf, gcc, variables } = props;

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

    showTooltip(variables, { index: ikf.index, segment: kfPos.segment, keyframe: ikf.keyframe });
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

      showTooltip(variables, undefined);
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
      onMouseEnter={action(() => showTooltip(variables, ikf))}
      onMouseMove={action(() => showTooltip(variables, ikf))}
      onMouseLeave={action(() => showTooltip(variables, undefined))}
    />
  );
});

class GraphCanvasVariables {
  xOffset: number = 0;
  tooltip: { pos: KeyframePos; speed: number } | undefined = undefined;

  constructor() {
    makeAutoObservable(this);
  }
}

const GraphCanvasElement = observer((props: {}) => {
  const { app, appPreferences: preferences } = getAppStores();

  const windowSize = useWindowSize();

  const popperRef = React.useRef<Instance>(null);
  const stageBoxRef = React.useRef<HTMLDivElement>(null);

  const [variables] = React.useState(() => new GraphCanvasVariables());

  const path = app.interestedPath();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(
    action(() => {
      variables.xOffset = 0;
    }),
    [path]
  );

  if (path === undefined) return null;

  const isExclusiveLayout = preferences.layoutType === LayoutType.EXCLUSIVE;

  const canvasHeight = isExclusiveLayout ? Math.max(windowSize.y * 0.12, 80) : windowSize.y * 0.12;
  const canvasWidth = isExclusiveLayout ? canvasHeight * 6.5 : windowSize.y * 0.78;
  const gcc = new GraphCanvasConverter(canvasWidth, canvasHeight, variables.xOffset, path);

  const fontSize = canvasHeight / 8;
  const fgColor = themes[preferences.themeType].foregroundColor;
  const bgColor = themes[preferences.themeType].backgroundColor;

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
      variables.xOffset = 0;
    } else {
      const maxScrollPos = gcc.pointWidth * (path.cachedResult.points.length - 2);
      variables.xOffset = clamp(variables.xOffset + delta, 0, maxScrollPos);
    }
  };

  return (
    <Tooltip
      title={(() => {
        const rtn = variables.tooltip?.speed;
        return rtn !== undefined && (speedFrom + rtn * (speedTo - speedFrom)).toUser();
      })()}
      placement="right"
      arrow
      followCursor
      PopperProps={{
        popperRef,
        anchorEl: {
          getBoundingClientRect: () => {
            const div = stageBoxRef.current;
            if (div === null || variables.tooltip === undefined) return new DOMRect(0, 0, 0, 0);

            const canvasPos = div.getBoundingClientRect();
            const posInPx = gcc.toPx(variables.tooltip.pos);
            return new DOMRect(canvasPos.x + posInPx.x, canvasPos.y + posInPx.y, 0, 0);
          }
        }
      }}>
      <Box ref={stageBoxRef}>
        <Stage
          width={canvasWidth}
          height={canvasHeight}
          onWheel={action(handleWheel)}
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

            <Keyframes {...{ path, gcc, variables }} />

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
