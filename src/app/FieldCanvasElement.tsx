import { action, makeObservable, observable, reaction } from "mobx";
import { observer } from "mobx-react-lite";
import { EndControl, Path, Segment, SegmentVariant, Vector, isAnyControl } from "../core/Path";
import Konva from "konva";
import { Circle, Group, Image, Layer, Line, Stage } from "react-konva";
import { SegmentElement } from "./SegmentElement";
import React from "react";
import useImage from "use-image";

import fieldImageUrl from "../static/field2023.png";
import { ControlElement } from "./ControlElement";
import { AreaSelectionElement } from "./AreaSelectionElement";
import { UnitConverter, UnitOfLength } from "../core/Unit";
import { FieldCanvasConverter, getClientXY } from "../core/Canvas";
import { clamp } from "../core/Util";
import { AddPath, AddSegment, ConvertSegment, RemovePathsAndEndControls, SplitSegment } from "../core/Command";
import { getAppStores } from "../core/MainApp";
import { RobotElement } from "./RobotElement";
import { fromHeadingInDegreeToAngleInRadian } from "../core/Calculation";
import { MagnetReference } from "../core/Magnet";
import { useMobxStorage, useTouchEvent, useWindowSize } from "../core/Hook";
import { LayoutType } from "./Layout";
import { Box } from "@mui/material";
import { Instance } from "@popperjs/core";
import { TouchEventListener } from "../core/TouchEventListener";
import { Label, Padding0Tooltip } from "../component/TooltipLabel";

const FieldTooltipContent = observer((props: {}) => {
  const { app, clipboard } = getAppStores();
  const fieldEditor = app.fieldEditor;

  function onAddCurve() {
    if (fieldEditor.tooltipPosition === undefined) return;

    const posInPx = fieldEditor.fcc.getUnboundedPx(fieldEditor.tooltipPosition);
    if (posInPx === undefined) return;

    const cpInUOL = fieldEditor.fcc.toUOL(new EndControl(posInPx.x, posInPx.y, 0));

    // UX: Set target path to "interested path"
    let targetPath: Path | undefined = app.interestedPath();
    if (targetPath === undefined) {
      // UX: Create empty new path if: no path exists
      targetPath = app.format.createPath();
      app.history.execute(`Add path ${targetPath.uid}`, new AddPath(app.paths, targetPath));
    }

    if (targetPath.visible && !targetPath.lock) {
      // UX: Add control point if: path is selected and visible and not locked
      app.history.execute(
        `Add curve segment with end control point ${cpInUOL.uid} to path ${targetPath.uid}`,
        new AddSegment(targetPath, cpInUOL, SegmentVariant.CUBIC)
      );
    }
  }

  function onAddLine() {
    if (fieldEditor.tooltipPosition === undefined) return;

    const posInPx = fieldEditor.fcc.getUnboundedPx(fieldEditor.tooltipPosition);
    if (posInPx === undefined) return;

    const cpInUOL = fieldEditor.fcc.toUOL(new EndControl(posInPx.x, posInPx.y, 0));

    // UX: Set target path to "interested path"
    let targetPath: Path | undefined = app.interestedPath();
    if (targetPath === undefined) {
      // UX: Create empty new path if: no path exists
      targetPath = app.format.createPath();
      app.history.execute(`Add path ${targetPath.uid}`, new AddPath(app.paths, targetPath));
    }

    if (targetPath.visible && !targetPath.lock) {
      // UX: Add control point if: path is selected and visible and not locked
      app.history.execute(
        `Add linear segment with end control point ${cpInUOL.uid} to path ${targetPath.uid}`,
        new AddSegment(targetPath, cpInUOL, SegmentVariant.LINEAR)
      );
    }
  }

  function onPaste() {
    clipboard.paste(undefined);
  }

  return (
    <Box>
      <Label text="Curve" onClick={onAddCurve} />
      <Label text="Line" onClick={onAddLine} />
      {clipboard.hasData && <Label text="Paste" onClick={onPaste} />}
    </Box>
  );
});

const ControlTooltipContent = observer((props: {}) => {
  function onDelete() {
    const { app } = getAppStores();

    if (app.selectedEntityCount === 0) return;
    const command = new RemovePathsAndEndControls(app.paths, app.selectedEntityIds);
    app.history.execute(`Remove paths and end controls`, command);
  }

  function onCopy() {
    const { clipboard } = getAppStores();

    clipboard.copy();
  }

  return (
    <Box>
      <Label text="Delete" onClick={onDelete} />
      <Label text="Copy" onClick={onCopy} />
    </Box>
  );
});

const SegmentTooltipContent = observer((props: {}) => {
  const { app } = getAppStores();
  const interaction = app.fieldEditor.lastInteraction;
  if (interaction?.entity instanceof Segment === false) return <></>;
  const segment = interaction?.entity as Segment;
  if (app.fieldEditor.tooltipPosition === undefined) return <></>;

  const posInPx = app.fieldEditor.fcc.getUnboundedPx(app.fieldEditor.tooltipPosition);
  if (posInPx === undefined) return <></>;

  function onConvert() {
    const path = app.paths.find(path => path.segments.includes(segment));
    if (path === undefined) return;

    if (segment.controls.length === 2)
      app.history.execute(
        `Convert segment ${segment.uid} to curve`,
        new ConvertSegment(path, segment, SegmentVariant.CUBIC)
      );
    else
      app.history.execute(
        `Convert segment ${segment.uid} to line`,
        new ConvertSegment(path, segment, SegmentVariant.LINEAR)
      );
  }

  function onSplit() {
    const path = app.paths.find(path => path.segments.includes(segment));
    if (path === undefined) return;

    const cpInUOL = app.fieldEditor.fcc.toUOL(new EndControl(posInPx!.x, posInPx!.y, 0));

    app.history.execute(
      `Split segment ${segment.uid} with control ${cpInUOL.uid}`,
      new SplitSegment(path, segment, cpInUOL)
    );
  }

  return (
    <Box>
      <Label text="Convert" onClick={onConvert} />
      <Label text="Split" onClick={onSplit} />
    </Box>
  );
});

const MagnetReferenceLine = observer((props: { magnetRef: MagnetReference | undefined; fcc: FieldCanvasConverter }) => {
  const { magnetRef, fcc } = props;
  if (magnetRef === undefined) return null;

  const { source, heading } = magnetRef;

  const theta = fromHeadingInDegreeToAngleInRadian(heading);

  const center = fcc.toPx(source);
  const distance = (Math.sqrt(fcc.pixelWidth ** 2 + fcc.pixelHeight ** 2) * 1.5) / fcc.scale;
  const start: Vector = center.add(new Vector(-distance * Math.cos(theta), distance * Math.sin(theta)));
  const end: Vector = center.add(new Vector(distance * Math.cos(theta), -distance * Math.sin(theta)));

  const lineWidth = 1;

  return <Line points={[start.x, start.y, end.x, end.y]} stroke="red" strokeWidth={lineWidth} />;
});

const PathPoints = observer((props: { path: Path; fcc: FieldCanvasConverter }) => {
  const { path, fcc } = props;

  const pc = path.pc;
  const speedFrom = pc.speedLimit.from;
  const speedTo = pc.speedLimit.to;
  const pointRadius = fcc.pixelHeight / 320;

  // ALGO: This is a separate component because it is expensive to render.

  return (
    <>
      {path.cachedResult.points.map((pointInUOL, index) => {
        const pointInPx = fcc.toPx(pointInUOL);
        const percentage = (pointInUOL.speed - speedFrom) / (speedTo - speedFrom || 1);
        // h => hue, s => saturation, l => lightness
        const color = `hsl(${clamp(percentage * 90, -20, 120)}, 70%, 50%)`; // red = min speed, green = max speed
        return <Circle key={index} x={pointInPx.x} y={pointInPx.y} radius={pointRadius} fill={color} />;
      })}
    </>
  );
});

const PathSegments = observer((props: { path: Path; fcc: FieldCanvasConverter }) => {
  const { path, fcc } = props;

  return (
    <>
      {path.segments.map(
        segment => segment.isVisible() && <SegmentElement key={segment.uid} {...{ segment, path, fcc }} />
      )}
    </>
  );
});

const PathControls = observer((props: { path: Path; fcc: FieldCanvasConverter }) => {
  const { path, fcc } = props;

  return (
    <>
      {path.segments.map(segment =>
        segment.controls.map((cp, cpIdx) => {
          const isFirstSegment = path.segments[0] === segment;
          if (isFirstSegment === false && cpIdx === 0) return null;
          return cp.visible && <ControlElement key={cp.uid} {...{ segment, path, fcc, cp }} />;
        })
      )}
    </>
  );
});

enum TouchAction {
  Start,
  PendingSelection,
  TouchingControl,
  TouchingSegment,
  ShowRobot,
  PanningAndScaling,
  Selection,
  Release,
  End,
  DraggingControl
}

class TouchInteractiveHandler extends TouchEventListener {
  touchAction: TouchAction = TouchAction.End;

  startSelectionTimer: NodeJS.Timeout | undefined = undefined;
  initialTime: number = 0;
  initialFieldScale: number = 0;
  initialPosition: Vector = new Vector(0, 0);
  initialDistanceBetweenTwoTouches: number = 0;
  lastEvent: TouchEvent | undefined = undefined;
  isPendingShowTooltip: boolean = false;

  constructor() {
    super();
    makeObservable(this, {
      touchAction: observable,
      startSelectionTimer: observable,
      initialTime: observable,
      initialFieldScale: observable,
      initialPosition: observable,
      initialDistanceBetweenTwoTouches: observable,
      lastEvent: observable,
      isPendingShowTooltip: observable,
      interact: action,
      onTouchStart: action,
      onTouchMove: action,
      onTouchEnd: action
    });

    reaction(
      () => this.touchAction,
      () => this.interact()
    );
  }

  // destructor() {}

  onTouchStart(evt: TouchEvent) {
    super.onTouchStart(evt);

    const keys = this.keys;

    if (keys.length === 1) {
      this.initialTime = Date.now();
      this.initialPosition = this.pos(keys[0]);
    } else if (keys.length >= 2) {
      const touch1 = this.pos(keys[0]);
      const touch2 = this.pos(keys[1]);
      const distance = touch1.distance(touch2);
      this.initialPosition = touch1.add(touch2).divide(2);
      this.initialDistanceBetweenTwoTouches = Math.max(distance, 0.1); // 0.1 pixel is the minimum distance
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

  interact() {
    const { app } = getAppStores();

    const keys = this.keys;
    if (this.touchAction === TouchAction.Start) {
      // UX: Clear hover effect from path tree if the user starts touching the field canvas
      app.hoverItem = undefined;

      this.isPendingShowTooltip = app.fieldEditor.tooltipPosition === undefined;
      app.fieldEditor.tooltipPosition = undefined;

      if (keys.length >= 1) {
        this.touchAction = TouchAction.PendingSelection;

        this.startSelectionTimer = setTimeout(
          action(() => {
            if (this.touchAction !== TouchAction.PendingSelection) return;

            app.setSelected([]);

            const posInPx = app.fieldEditor.fcc.getUnboundedPxFromNativeEvent(this.lastEvent!);
            if (posInPx === undefined) return;

            app.fieldEditor.startAreaSelection(posInPx);
            this.touchAction = TouchAction.Selection;
          }),
          600
        ); // Magic number
      } else {
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.PendingSelection) {
      if (isAnyControl(app.fieldEditor.interaction?.entity)) {
        this.touchAction = TouchAction.TouchingControl;
      } else if (app.fieldEditor.interaction?.entity instanceof Segment) {
        this.touchAction = TouchAction.TouchingSegment;
      } else if (keys.length >= 1) {
        const t = this.pos(keys[0]);
        if (t.distance(this.initialPosition) > 96 * 0.25) {
          // 1/4 inch, magic number
          this.initialFieldScale = app.fieldEditor.scale;
          this.touchAction = TouchAction.PanningAndScaling;
        }
      } else {
        this.touchAction = TouchAction.Release;
      }
    } else if (this.touchAction === TouchAction.TouchingControl) {
      if (app.fieldEditor.interaction?.type === "drag") {
        this.touchAction = TouchAction.DraggingControl;
      } else if (keys.length === 0) {
        app.fieldEditor.tooltipPosition = getClientXY(this.lastEvent!);
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.TouchingSegment) {
      if (keys.length >= 1) {
        // UX: Look like dragging if: touch segment and move finger
        const t = this.pos(keys[0]);
        if (t.distance(this.initialPosition) > 96 * 0.25) {
          // 1/4 inch, magic number
          this.initialFieldScale = app.fieldEditor.scale;
          this.touchAction = TouchAction.PanningAndScaling;
        }
      } else if (keys.length === 0) {
        app.fieldEditor.tooltipPosition = getClientXY(this.lastEvent!);
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.ShowRobot) {
      if (keys.length >= 2) {
        this.initialFieldScale = app.fieldEditor.scale;
        this.touchAction = TouchAction.PanningAndScaling;
      } else if (keys.length === 1) {
        const posInPx = app.fieldEditor.fcc.getUnboundedPx(this.pos(keys[0]));
        if (posInPx === undefined) return;
        app.fieldEditor.showRobot(posInPx);
      } else if (keys.length === 0) {
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.DraggingControl) {
      if (keys.length === 0) {
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.PanningAndScaling) {
      if (keys.length === 1) {
        if (app.gc.showRobot && app.fieldEditor.interaction?.entity instanceof Segment) {
          this.touchAction = TouchAction.ShowRobot;
        } else {
          app.fieldEditor.panning(this.vec(this.keys[0]).divide(app.fieldEditor.scale));
        }
      } else if (keys.length >= 2) {
        const t1 = this.pos(keys[0]);
        const t2 = this.pos(keys[1]);
        const scale = this.initialFieldScale * (t1.distance(t2) / this.initialDistanceBetweenTwoTouches);
        const middlePos = t1.add(t2).divide(2);
        app.fieldEditor.zooming(scale, middlePos);

        const vecPos = this.vec(keys[0]).add(this.vec(keys[1])).divide(2);
        app.fieldEditor.panning(vecPos.divide(app.fieldEditor.scale));
      } else {
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.Selection) {
      if (keys.length >= 1) {
        const posInPx = app.fieldEditor.fcc.getUnboundedPxFromNativeEvent(this.lastEvent!);
        if (posInPx === undefined) return;

        app.fieldEditor.updateAreaSelection(posInPx);
      } else {
        this.touchAction = TouchAction.End;
      }
    } else if (this.touchAction === TouchAction.Release) {
      if (Date.now() - this.initialTime < 600) {
        // UX: If click without moving the finger

        if (this.isPendingShowTooltip && app.selectedEntityCount !== 0) {
          // UX: Clear selection first if last interaction is clicking field and there is a selection
          app.setSelected([]);
        } else if (this.isPendingShowTooltip) {
          // UX: Show tooltip if last interaction is clicking field and no area selection and no tooltip is shown
          // this.pos(keys[0]) is undefined, use last event
          app.fieldEditor.tooltipPosition = getClientXY(this.lastEvent!);
        }
      }
      this.touchAction = TouchAction.End;
    } else if (this.touchAction === TouchAction.End) {
      if (keys.length === 0) {
        app.fieldEditor.endAreaSelection();
        app.fieldEditor.endGrabAndMove();
        // UX: Only end interaction if: no finger is touching the screen
        app.fieldEditor.endInteraction();
        app.magnet = [];

        // ALGO: Cancel selection if the user lifts the finger
        clearTimeout(this.startSelectionTimer);
        this.startSelectionTimer = undefined;
      } else {
        this.touchAction = TouchAction.Start;
      }
    }
  }

  interactWithEvent(evt: TouchEvent) {
    this.lastEvent = evt;
    this.interact();
  }
}

const FieldCanvasElement = observer((props: {}) => {
  const { app, appPreferences } = getAppStores();

  const windowSize = useWindowSize(
    action((newSize: Vector, oldSize: Vector) => {
      const ratio = (newSize.y + oldSize.y) / 2 / oldSize.y;
      app.fieldEditor.offset = app.fieldEditor.offset.multiply(ratio);
    })
  );

  const popperRef = React.useRef<Instance>(null);
  const stageBoxRef = React.useRef<HTMLDivElement>(null);

  const uc = new UnitConverter(UnitOfLength.Millimeter, app.gc.uol);
  const isExclusiveLayout = appPreferences.layoutType === LayoutType.EXCLUSIVE;

  const canvasHeightInPx = (function () {
    if (isExclusiveLayout) return windowSize.y;
    if (app.view.showSpeedCanvas) return windowSize.y - 16 - 8 - 8 - 16 - 8 - windowSize.y * 0.12 - 8 - 16;
    else return windowSize.y - 16 * 2 - 8 * 2;
  })();
  const canvasWidthInPx = isExclusiveLayout ? windowSize.x : canvasHeightInPx;
  const canvasSizeInUOL = uc.fromAtoB(3683); // 3683 = 145*2.54*10 ~= 3676.528, the size of the field perimeter in Fusion 360

  const [fieldImage] = useImage(fieldImageUrl);

  const offset = app.fieldEditor.offset;
  const scale = app.fieldEditor.scale;

  const fcc = new FieldCanvasConverter(
    canvasWidthInPx,
    canvasHeightInPx,
    canvasSizeInUOL,
    canvasSizeInUOL,
    offset,
    scale,
    stageBoxRef.current
  );

  app.fieldEditor.fcc = fcc;
  const fieldEditor = app.fieldEditor;
  const tiHandler = useMobxStorage(() => new TouchInteractiveHandler());
  useTouchEvent(tiHandler, fcc.container);

  function onWheelStage(event: Konva.KonvaEventObject<WheelEvent>) {
    const evt = event.evt;

    if (
      evt.ctrlKey === false &&
      (evt.deltaX !== 0 || evt.deltaY !== 0) &&
      fieldEditor.isGrabAndMove === false &&
      app.wheelControl("panning")
    ) {
      // UX: Panning if: ctrl key up + wheel/mouse pad + no "Grab & Move" + not changing heading value with scroll wheel in the last 300ms

      evt.preventDefault();

      fieldEditor.panning(new Vector(evt.deltaX * -0.5, evt.deltaY * -0.5));
    } else if (evt.ctrlKey === true && evt.deltaY !== 0) {
      // UX: Zoom in/out if: wheel while ctrl key down

      evt.preventDefault();

      const pos = fcc.getUnboundedPxFromEvent(event, false, false);
      if (pos === undefined) return;

      fieldEditor.zooming(scale * (1 - evt.deltaY / 1000), pos);
    }
  }

  function onMouseDownStage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    if ((evt.button === 0 || evt.button === 2) && event.target instanceof Konva.Image) {
      // UX: A flag to indicate that the user is adding a control, this will set to false if mouse is moved
      // UX: onClickFieldImage will check this state, control can only be added inside the field image because of this
      fieldEditor.isAddingControl = true;
    }

    if (
      evt.button === 0 &&
      fieldEditor.isGrabAndMove === false &&
      (event.target instanceof Konva.Stage || event.target instanceof Konva.Image)
    ) {
      // left click
      // UX: Only start selection if: left click on the canvas or field image
      // UX: Do not start selection if it is in "Grab & Move"

      if (evt.shiftKey === false) {
        // UX: Clear selection if: left click without shift
        app.clearSelected();
      }

      // UX: selectedBefore is empty if: left click without shift
      const posInPx = fcc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;
      fieldEditor.startAreaSelection(posInPx);
    } else if (evt.button === 1 && fieldEditor.areaSelection === undefined) {
      // middle click
      // UX: Start "Grab & Move" if: middle click at any position
      evt.preventDefault(); // UX: Prevent default action (scrolling)

      const posWithoutOffsetInPx = fcc.getUnboundedPxFromEvent(event, false);
      if (posWithoutOffsetInPx === undefined) return;
      fieldEditor.startGrabAndMove(posWithoutOffsetInPx);
    } else if (evt.button === 1 && fieldEditor.areaSelection !== undefined) {
      // middle click
      // UX: Do not start "Grab & Move" if it is in area selection, but still prevent default
      evt.preventDefault(); // UX: Prevent default action (scrolling)
    }
  }

  function onMouseMoveOrDragStage(event: Konva.KonvaEventObject<DragEvent | MouseEvent | TouchEvent>) {
    /*
    UX:
    Both mouse move and drag events will trigger this function. it allows users to perform area selection and 
    "Grab & Move" outside the canvas. Both events are needed to maximize usability.

    Normally, both events will be triggered at the same time. (but I don't know why onDragMove returns MouseEvent)
    After the mouse is dragged outside the canvas, only drag event will be triggered. Also, the dragging state will 
    come to an end when any mouse button is down. When it is happened only mouse move event will be triggered.
    */

    // UX: It is not actually dragged "stage", reset the position to (0, 0)
    if (event.target instanceof Konva.Stage) event.target.setPosition(new Vector(0, 0));

    if (event.evt instanceof TouchEvent === false) {
      fieldEditor.isAddingControl = false;

      const posInPx = fcc.getUnboundedPxFromEvent(event);
      if (posInPx === undefined) return;
      const posWithoutOffsetInPx = fcc.getUnboundedPxFromEvent(event, false);
      if (posWithoutOffsetInPx === undefined) return;

      fieldEditor.updateAreaSelection(posInPx) ||
        fieldEditor.grabAndMove(posWithoutOffsetInPx) ||
        fieldEditor.showRobot(posInPx);
    }
  }

  function onMouseUpStage(event: Konva.KonvaEventObject<MouseEvent>) {
    // UX: This event is triggered only if the mouse is up inside the canvas.
    // UX: Only reset selection or "Grab & Move" if: left click or middle click released respectively

    if (event.evt.button === 0) {
      // left click
      fieldEditor.endAreaSelection();
      fieldEditor.endInteraction();
    } else if (event.evt.button === 1) {
      // middle click
      fieldEditor.endGrabAndMove();
    }

    app.magnet = [];
  }

  function onDragEndStage(event: Konva.KonvaEventObject<DragEvent | TouchEvent>) {
    /*
    UX:
    If the mouse is down(any buttons), the drag end event is triggered.
    After that, without dragging, we lose the information of the mouse position outside the canvas.
    We reset everything if the mouse is down outside the canvas.
    */

    // UX: No need to call touchend event handler here

    const rect = event.target.getStage()?.container().getBoundingClientRect();
    if (rect === undefined) return;

    if (event.evt === undefined) return; // XXX: Drag end event from segment control

    const { x: clientX, y: clientY } = getClientXY(event.evt);

    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      fieldEditor.endAreaSelection();
      fieldEditor.endGrabAndMove();
      fieldEditor.endInteraction();
      app.magnet = [];
    }
  }

  function onClickFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Add control point if: left click or right click without moving the mouse
    if (!(fieldEditor.isAddingControl && (evt.button === 0 || evt.button === 2))) return;

    fieldEditor.isAddingControl = false;

    const posInPx = fcc.getUnboundedPxFromEvent(event);
    if (posInPx === undefined) return;

    const cpInUOL = fcc.toUOL(new EndControl(posInPx.x, posInPx.y, 0));

    // UX: Set target path to "interested path"
    let targetPath: Path | undefined = app.interestedPath();
    if (targetPath === undefined) {
      // UX: Create empty new path if: no path exists
      targetPath = app.format.createPath();
      app.history.execute(`Add path ${targetPath.uid}`, new AddPath(app.paths, targetPath));
    }
    if (targetPath.visible && !targetPath.lock) {
      // UX: Add control point if: path is selected and visible and not locked
      if (evt.button === 0) {
        // UX: Add 4-controls curve if: left click
        app.history.execute(
          `Add curve segment with end control point ${cpInUOL.uid} to path ${targetPath.uid}`,
          new AddSegment(targetPath, cpInUOL, SegmentVariant.CUBIC)
        );
      } else if (evt.button === 2) {
        // UX: Add straight line if: right click
        app.history.execute(
          `Add linear segment with end control point ${cpInUOL.uid} to path ${targetPath.uid}`,
          new AddSegment(targetPath, cpInUOL, SegmentVariant.LINEAR)
        );
      }
    }

    // UX: Select the new control point
    app.setSelected([cpInUOL]);
    // UX: Expand the path to show the new control point
    app.addExpanded(targetPath);
  }

  const visiblePaths = app.paths.filter(path => path.visible);

  return (
    <Padding0Tooltip
      title={(() => {
        const entity = fieldEditor.lastInteraction?.entity;
        if (entity instanceof Segment) return <SegmentTooltipContent />;
        if (app.selectedEntityCount !== 0) return <ControlTooltipContent />;
        else return <FieldTooltipContent />;
      })()}
      placement="top"
      arrow
      open={fieldEditor.tooltipPosition !== undefined}
      disableFocusListener
      disableHoverListener
      disableTouchListener
      PopperProps={{
        disablePortal: true,
        popperRef,
        anchorEl: {
          getBoundingClientRect: () => {
            const div = stageBoxRef.current;
            if (div === null || fieldEditor.tooltipPosition === undefined) return new DOMRect(-200, -200, 0, 0);

            return new DOMRect(fieldEditor.tooltipPosition.x, fieldEditor.tooltipPosition.y, 0, 0);
          }
        }
      }}>
      <Box ref={stageBoxRef}>
        <Stage
          className="field-canvas"
          width={fcc.pixelWidth}
          height={fcc.pixelHeight}
          scale={new Vector(scale, scale)}
          offset={offset.subtract(fcc.viewOffset)}
          draggable
          style={{ cursor: fieldEditor.isGrabAndMove ? "grab" : "" }}
          // onTouchStart={action(onTouchStartStage)}
          // onTouchMove={action(onTouchMoveStage)}
          // onTouchEnd={action(onTouchEndStage)}
          onContextMenu={e => e.evt.preventDefault()}
          onWheel={action(onWheelStage)}
          onMouseDown={action(onMouseDownStage)}
          onMouseMove={action(onMouseMoveOrDragStage)}
          onMouseUp={action(onMouseUpStage)}
          onDragMove={action(onMouseMoveOrDragStage)}
          onDragEnd={action(onDragEndStage)}>
          <Layer>
            {fieldImage && (
              <Image
                image={fieldImage}
                width={(fieldImage.width / fieldImage.height) * fcc.pixelHeight}
                height={fcc.pixelHeight}
                onClick={action(onClickFieldImage)}
              />
            )}
            {app.magnet.map((magnetRef, idx) => (
              <MagnetReferenceLine key={idx} magnetRef={magnetRef} fcc={fcc} />
            ))}
            {visiblePaths.map(path => (
              <PathPoints key={path.uid} path={path} fcc={fcc} />
            ))}
            {visiblePaths.map(path => (
              <PathSegments key={path.uid} path={path} fcc={fcc} />
            ))}
            {visiblePaths.map(path => (
              <PathControls key={path.uid} path={path} fcc={fcc} />
            ))}
            {app.gc.showRobot && app.robot.position.visible && (
              <RobotElement fcc={fcc} pos={app.robot.position} width={app.gc.robotWidth} height={app.gc.robotHeight} />
            )}
            <Group name="selected-controls" />
            <AreaSelectionElement
              from={fieldEditor.areaSelection?.from}
              to={fieldEditor.areaSelection?.to}
              animation={tiHandler.keys.length !== 0}
            />
          </Layer>
        </Stage>
      </Box>
    </Padding0Tooltip>
  );
});

export { FieldCanvasElement };
