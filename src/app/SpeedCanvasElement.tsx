import { makeObservable, action, observable, reaction } from "mobx";
import { observer } from "mobx-react-lite";
import { Point, Path, Vector, Keyframe, KeyframePos } from "../core/Path";
import Konva from "konva";
import { Circle, Layer, Line, Rect, Stage, Text } from "react-konva";
import React from "react";
import { PathConfig } from "../format/Config";
import { AddKeyframe, MoveKeyframe, RemoveKeyframe, UpdateProperties } from "../core/Command";
import { getAppStores } from "../core/MainApp";
import { KeyframeIndexing } from "../core/Calculation";
import { GraphCanvasConverter, getClientXY } from "../core/Canvas";
import { Box } from "@mui/material";
import { Instance } from "@popperjs/core";
import { useMobxStorage, useTouchEvent, useWindowSize } from "../core/Hook";
import { LayoutType } from "./Layout";
import { getAppThemeInfo } from "./Theme";
import { TouchEventListener } from "../core/TouchEventListener";
import { Label, Padding0Tooltip } from "../component/TooltipLabel";

const FONT_FAMILY = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

const SpeedCanvasTooltipContent = observer((props: {}) => {
  const { app } = getAppStores();
  const speedEditor = app.speedEditor;

  const path = speedEditor.path;
  const pos = app.speedEditor.tooltipPosition;

  if (path === undefined || pos === undefined) return <></>;

  const speedFrom = path.pc.speedLimit.from;
  const speedTo = path.pc.speedLimit.to;

  const lastInteraction = app.speedEditor.lastInteraction;
  const interaction = app.speedEditor.interaction;
  if (interaction?.keyframe instanceof Keyframe && interaction?.type === "drag/hover") {
    return <Box sx={{ padding: "8px" }}>{(speedFrom + pos.yPos * (speedTo - speedFrom)).toUser()}</Box>;
  } else if (lastInteraction?.keyframe instanceof Keyframe && lastInteraction?.type === "touch") {
    const keyframe = lastInteraction.keyframe;
    return (
      <Box>
        <Label
          text="Toggle Bent Rate"
          onClick={() => {
            const setTo = !keyframe.followBentRate;
            app.history.execute(
              `Update keyframe ${keyframe.uid} followCurve to ${setTo}`,
              new UpdateProperties(keyframe, { followBentRate: setTo }),
              0
            );
          }}
        />
        <Label
          text="Delete"
          onClick={() => {
            app.history.execute(
              `Remove keyframe ${keyframe.uid} from path ${path.uid}`,
              new RemoveKeyframe(path, keyframe)
            );
          }}
        />
      </Box>
    );
  } else {
    return <></>;
  }
});

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

  let p1 = (point.bentRate - bentRateLow) / (bentRateHigh - bentRateLow || 1);
  let p2 = (point.speed - speedFrom) / (speedTo - speedFrom || 1);
  let x = gcc.toPxNumber(index);
  let y1 = (1 - p1) * (gcc.pixelHeight * 0.6) + gcc.axisLineTopX;
  let y2 = (1 - p2) * (gcc.pixelHeight * 0.6) + gcc.axisLineTopX;
  const color = `hsl(${p2 * 90}, 70%, 50%)`; // red = min speed, green = max speed

  return (
    <>
      {point.isLast && <Line points={[x, 0, x, gcc.pixelHeight]} stroke="grey" strokeWidth={gcc.lineWidth} listening={false} />}
      <Circle x={x} y={y1} radius={gcc.pointRadius} fill={"grey"} listening={false} />
      <Circle x={x} y={y2} radius={gcc.pointRadius} fill={color} listening={false} />
    </>
  );
});

interface KeyframeElementProps {
  ikf: KeyframeIndexing;
  gcc: GraphCanvasConverter;
}

const KeyframeElement = observer((props: KeyframeElementProps) => {
  const { app } = getAppStores();
  const { ikf, gcc } = props;

  const onTouchStart = (event: Konva.KonvaEventObject<TouchEvent>) => {
    app.speedEditor.interact(ikf.keyframe, "touch");
  };

  const onDragKeyframe = (event: Konva.KonvaEventObject<DragEvent>) => {
    const evt = event.evt;

    const canvasPos = event.target.getStage()?.container().getBoundingClientRect();
    if (canvasPos === undefined) return;

    // UX: Calculate the position of the control point by the client mouse position
    // UX: Allow to drag the control point outside of the graph
    const kfPos = gcc.toPos(getClientXY(evt).subtract(new Vector(canvasPos.x, canvasPos.y)));
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

    app.speedEditor.interact(ikf.keyframe, "drag/hover");
    app.speedEditor.tooltipPosition = kfPos;
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

      app.speedEditor.tooltipPosition = undefined;
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
      onTouchStart={action(onTouchStart)}
      onDragMove={action(onDragKeyframe)}
      onClick={action(onClickKeyframe)}
      onMouseEnter={action(() => {
        app.speedEditor.interact(ikf.keyframe, "drag/hover");
        app.speedEditor.tooltipPosition = ikf.toKeyframePos();
      })}
      onMouseMove={action(() => (app.speedEditor.tooltipPosition = ikf.toKeyframePos()))}
      onMouseLeave={action(() => {
        app.speedEditor.endInteraction();
        app.speedEditor.tooltipPosition = undefined;
      })}
    />
  );
});

enum TouchAction {
  Start,
  PendingScrolling,
  Panning,
  TouchingKeyframe,
  DraggingKeyframe,
  Release,
  End
}

class TouchInteractiveHandler extends TouchEventListener {
  touchAction: TouchAction = TouchAction.End;

  initialTime: number = 0;
  initialPosition: Vector = new Vector(0, 0);
  lastEvent: TouchEvent | undefined = undefined;
  wasShowingTooltip: boolean = false;

  constructor() {
    super();
    makeObservable(this, {
      touchAction: observable,
      initialTime: observable,
      initialPosition: observable,
      lastEvent: observable,
      wasShowingTooltip: observable,
      onTouchStart: action,
      onTouchMove: action,
      onTouchEnd: action
    });

    reaction(
      () => this.touchAction,
      () => this.interact()
    );
  }

  onTouchStart(evt: TouchEvent) {
    super.onTouchStart(evt);

    const keys = this.keys;
    if (keys.length === 1) {
      this.initialTime = Date.now();
      this.initialPosition = this.pos(keys[0]);
    }

    this.interactWithEvent(evt);
  }

  onTouchMove(evt: TouchEvent) {
    super.onTouchMove(evt);

    this.interactWithEvent(evt);
  }

  onTouchEnd(evt: TouchEvent) {
    super.onTouchEnd(evt);

    this.interactWithEvent(evt);
  }

  private getKeyframePos(): KeyframePos | undefined {
    const { app } = getAppStores();

    const evt = this.lastEvent!;
    const path = app.speedEditor.path;
    const gcc = app.speedEditor.gcc;
    const canvasPos = gcc.container?.getBoundingClientRect();

    if (path && canvasPos) {
      const kfPos = gcc.toPos(getClientXY(evt).subtract(new Vector(canvasPos.x, canvasPos.y)));
      if (kfPos) {
        return kfPos;
      }
    }
    return undefined;
  }

  interact() {
    const { app } = getAppStores();

    const keys = this.keys;
    if (this.touchAction === TouchAction.Start) {
      this.wasShowingTooltip = app.speedEditor.tooltipPosition !== undefined;
      app.speedEditor.tooltipPosition = undefined;

      if (keys.length >= 1) {
        this.touchAction = TouchAction.PendingScrolling;
      } else {
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.PendingScrolling) {
      if (app.speedEditor.interaction?.keyframe instanceof Keyframe) {
        this.touchAction = TouchAction.TouchingKeyframe;
      } else if (keys.length >= 1) {
        const t = this.pos(keys[0]);
        if (t.distance(this.initialPosition) > 96 * 0.25) {
          // 1/4 inch, magic number
          this.touchAction = TouchAction.Panning;
        }
      } else {
        this.touchAction = TouchAction.Release;
      }
    } else if (this.touchAction === TouchAction.Panning) {
      if (app.speedEditor.interaction?.keyframe instanceof Keyframe) {
        this.touchAction = TouchAction.TouchingKeyframe;
      } else if (keys.length >= 1) {
        app.speedEditor.panning(this.vec(keys[0]).x);
      } else {
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.TouchingKeyframe) {
      if (app.speedEditor.interaction?.type === "drag/hover") {
        this.touchAction = TouchAction.DraggingKeyframe;
      } else if (keys.length === 0) {
        const kfPos = this.getKeyframePos();
        if (kfPos) {
          app.speedEditor.tooltipPosition = kfPos;
        }
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.DraggingKeyframe) {
      if (keys.length === 0) {
        app.speedEditor.tooltipPosition = undefined;
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.Release) {
      if (this.wasShowingTooltip === false) {
        const kfPos = this.getKeyframePos();
        if (kfPos && app.speedEditor.isAddingKeyframe) {
          app.history.execute(
            `Add speed keyframe to path ${app.speedEditor.path?.uid}`,
            new AddKeyframe(app.speedEditor.path!, kfPos)
          );
        }
      }

      this.touchAction = TouchAction.End;
    } else if (this.touchAction === TouchAction.End) {
      if (keys.length === 0) {
        app.speedEditor.isAddingKeyframe = false;
        app.speedEditor.endInteraction();
      } else if (keys.length >= 1) {
        this.touchAction = TouchAction.Start;
      }
    }
  }

  interactWithEvent(evt: TouchEvent) {
    this.lastEvent = evt;
    this.interact();
  }
}

const SpeedCanvasElement = observer((props: {}) => {
  const { app, appPreferences: preferences } = getAppStores();

  const windowSize = useWindowSize();

  const popperRef = React.useRef<Instance>(null);
  const stageBoxRef = React.useRef<HTMLDivElement>(null);

  const tiHandler = useMobxStorage(() => new TouchInteractiveHandler());

  useTouchEvent(tiHandler, stageBoxRef.current);

  const path = app.interestedPath();

  React.useEffect(
    action(() => {
      app.speedEditor.offset = 0;
    }),
    [path]
  );

  app.speedEditor.path = path;

  if (path === undefined) return null;

  const isExclusiveLayout = preferences.layoutType === LayoutType.EXCLUSIVE;

  const canvasHeight = isExclusiveLayout ? Math.max(windowSize.y * 0.12, 80) : windowSize.y * 0.12;
  const canvasWidth = isExclusiveLayout ? canvasHeight * 6.5 : (windowSize.y - 16 - 8 - 8 - 16 - 8 - windowSize.y * 0.12 - 8 - 16);
  const gcc = new GraphCanvasConverter(canvasWidth, canvasHeight, app.speedEditor.offset, path, stageBoxRef.current);

  const fontSize = canvasHeight / 8;
  const fgColor = getAppThemeInfo().foregroundColor;
  const bgColor = getAppThemeInfo().backgroundColor;

  const speedFrom = path.pc.speedLimit.from;
  const speedTo = path.pc.speedLimit.to;

  const bentRateHigh = path.pc.bentRateApplicableRange.to;
  const bentRateLow = path.pc.bentRateApplicableRange.from;

  app.speedEditor.gcc = gcc;

  const onGraphClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // UX: Allow to add keyframes only with left mouse button
    if (e.evt.button !== 0) return;

    if (path === undefined) return;

    const kfPos = gcc.toPos(new Vector(e.evt.offsetX, e.evt.offsetY));
    if (kfPos === undefined) return;

    app.history.execute(`Add speed keyframe to path ${path.uid}`, new AddKeyframe(path, kfPos));
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    const delta = (Math.abs(e.evt.deltaX) > Math.abs(e.evt.deltaY * 1.5) ? e.evt.deltaX : e.evt.deltaY) / 5;

    e.evt.preventDefault(); // UX: Disable swipe left action on touch pad

    app.speedEditor.panning(delta);
  };

  return (
    <Padding0Tooltip
      title={<SpeedCanvasTooltipContent />}
      placement="right"
      arrow
      open={app.speedEditor.tooltipPosition !== undefined}
      disableFocusListener
      disableHoverListener
      disableTouchListener
      PopperProps={{
        disablePortal: true,
        popperRef,
        anchorEl: {
          getBoundingClientRect: () => {
            const div = stageBoxRef.current;
            if (div === null || app.speedEditor.tooltipPosition === undefined) return new DOMRect(-200, -200, 0, 0);

            const canvasPos = div.getBoundingClientRect();
            const posInPx = gcc.toPx(app.speedEditor.tooltipPosition);
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
              onTouchStart={() => (app.speedEditor.isAddingKeyframe = true)}
              onClick={action(onGraphClick)}
            />

            <Keyframes {...{ path, gcc }} />

            <Rect x={0} y={0} width={gcc.axisTitleWidth} height={gcc.pixelHeight} fill={bgColor} />
            <Text
              text={speedTo + ""}
              x={0}
              y={gcc.axisLineTopX - fontSize / 2}
              fontSize={fontSize}
              fontFamily={FONT_FAMILY}
              fill={fgColor}
              align="right"
              width={gcc.axisTitleWidth * 0.9}
            />
            <Text
              text={speedFrom + ""}
              x={0}
              y={gcc.axisLineBottomX - fontSize / 2}
              fontSize={fontSize}
              fontFamily={FONT_FAMILY}
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
              y={gcc.axisLineTopX - fontSize / 2}
              fontSize={fontSize}
              fontFamily={FONT_FAMILY}
              fill={fgColor}
              width={gcc.axisTitleWidth}
            />
            <Text
              text={bentRateLow + ""}
              x={gcc.rightPaddingStart + gcc.pointWidth}
              y={gcc.axisLineBottomX - fontSize / 2}
              fontSize={fontSize}
              fontFamily={FONT_FAMILY}
              fill={fgColor}
              width={gcc.axisTitleWidth}
            />

            <Text
              text={"Speed"}
              x={0}
              y={gcc.pixelHeight}
              fontSize={fontSize}
              fontFamily={FONT_FAMILY}
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
              fontFamily={FONT_FAMILY}
              fill={fgColor}
              width={gcc.pixelHeight}
              height={fontSize}
              align="center"
              rotation={90}
            />
          </Layer>
        </Stage>
      </Box>
    </Padding0Tooltip>
  );
});

export { SpeedCanvasElement };
