import { makeObservable, makeAutoObservable, action, observable } from "mobx";
import { observer } from "mobx-react-lite";
import { AnyControl, Control, EndControl, Path, Vector } from "../core/Path";
import Konva from "konva";
import { Circle, Line } from "react-konva";
import { Portal } from "react-konva-utils";
import { SegmentElementProps } from "./SegmentElement";
import { DragControls, RemovePathsAndEndControls, UpdatePathTreeItems } from "../core/Command";
import { getAppStores } from "../core/MainApp";
import { boundHeading, fromHeadingInDegreeToAngleInRadian, toHeading } from "../core/Calculation";
import { MagnetReference, magnet } from "../core/Magnet";
import React from "react";
import { TouchEventListener } from "../core/TouchEventListener";
import { useMobxStorage } from "../core/Hook";
import { isKonvaTouchEvent } from "../core/Canvas";

export interface ControlElementProps extends SegmentElementProps {
  cp: AnyControl;
}

function getFollowersAndRemaining(
  paths: Path[],
  target: AnyControl,
  selected: string[],
  includeControl: boolean
): [AnyControl[], AnyControl[]] {
  const followers: AnyControl[] = [];
  const remaining: AnyControl[] = [];
  for (let path of paths) {
    for (let control of path.controls) {
      if (control === target) continue;
      if (control.visible === false || path.visible === false) continue;
      if (
        (!(control instanceof EndControl) && !includeControl) ||
        !selected.includes(control.uid) ||
        control.lock ||
        path.lock
      ) {
        remaining.push(control);
      } else {
        followers.push(control);
      }
    }
  }

  return [followers, remaining];
}

function getHorizontalAndVerticalReferences(source: Vector, originHeading: number): MagnetReference[] {
  return [
    { source, heading: boundHeading(originHeading) },
    { source, heading: boundHeading(originHeading + 90) }
  ];
}

function getSiblingReferences(path: Path, target: AnyControl, followers: AnyControl[]): MagnetReference[] {
  const references: MagnetReference[] = [];

  const controls = path.controls;
  const idx = controls.indexOf(target);

  function findEndControl(step: number): EndControl | undefined {
    for (let i = idx + step; i >= 0 && i < controls.length; i += step) {
      if (controls[i] instanceof EndControl) return controls[i] as EndControl;
    }
    return undefined;
  }

  function func(c1: AnyControl, c2: AnyControl) {
    if (c1.visible && !followers.includes(c1) && c2.visible && !followers.includes(c2)) {
      references.push({ source: c1, heading: toHeading(c2.subtract(c1.toVector())) });
    }
  }

  if (idx >= 2) func(controls[idx - 1], controls[idx - 2]);
  if (idx < controls.length - 2) func(controls[idx + 1], controls[idx + 2]);

  const prevEndControl = findEndControl(-1);
  if (prevEndControl && !followers.includes(prevEndControl))
    references.push({ source: prevEndControl, heading: prevEndControl.heading });
  const nextEndControl = findEndControl(+1);
  if (nextEndControl && !followers.includes(nextEndControl))
    references.push({ source: nextEndControl, heading: nextEndControl.heading });

  return references;
}

function getSiblingControls(path: Path, target: EndControl): Control[] {
  const controls = path.controls;
  const idx = controls.indexOf(target);
  if (idx === -1) return [];

  const prev: AnyControl | undefined = controls[idx - 1];
  const next: AnyControl | undefined = controls[idx + 1];

  const siblingControls: Control[] = [];
  if (prev instanceof Control) siblingControls.push(prev);
  if (next instanceof Control) siblingControls.push(next);

  return siblingControls;
}

function shouldInteract(props: ControlElementProps, event: Konva.KonvaEventObject<MouseEvent | TouchEvent>): boolean {
  const { app } = getAppStores();

  // UX: Do not interact with control points if itself or the path is locked
  // UX: Do not interact with control points if middle click
  if (
    props.cp.lock ||
    props.path.lock ||
    app.fieldEditor.areaSelection !== undefined ||
    app.fieldEditor.isGrabAndMove
  ) {
    event.evt.preventDefault();
    event.target.stopDrag();
    return false;
  }

  return true;
}

function onDragMoveAnyControl(
  props: ControlElementProps,
  enableMagnet: boolean,
  posBeforeDrag: Vector,
  event: Konva.KonvaEventObject<DragEvent | TouchEvent>
) {
  const { app } = getAppStores();

  const evt = event.evt;

  /* UX:
  This could be true if the user first touch the field with one finger, then touch the control point with another
  finger, then release the first finger. In this case, the touch event will be fired on the control point, but the
  interaction is still on the field. So we need to stop the drag event.
  */
  // UX: Do not interact with control points if it is not the target of the interaction
  // UX: Do not interact with control points if itself or the path is locked
  if (
    props.cp.lock ||
    props.path.lock ||
    app.fieldEditor.areaSelection !== undefined ||
    app.fieldEditor.interactWithEntity(props.cp, "drag") === false
  ) {
    evt.preventDefault();

    const cpInUOL = props.cp.toVector(); // ALGO: Use toVector for better performance
    const cpInPx = props.fcc.toPx(cpInUOL);

    // UX: Set the position of the control point back to the original position
    event.target.x(cpInPx.x);
    event.target.y(cpInPx.y);
    event.target.stopDrag();
    return;
  }

  const oldCpInUOL = props.cp.toVector();

  // UX: Calculate the position of the control point by the client mouse position
  let cpInPx = props.fcc.getUnboundedPxFromEvent(event);
  if (cpInPx === undefined) return;
  let cpInUOL = props.fcc.toUOL(cpInPx);
  // first set the position of the control point so we can calculate the position of the follower control points
  props.cp.setXY(cpInUOL);

  const isControlFollow = !evt.ctrlKey;

  let [followers, remains] = getFollowersAndRemaining(app.paths, props.cp, app.selectedEntityIds, isControlFollow);

  if (props.cp instanceof EndControl && isControlFollow) {
    const siblings = getSiblingControls(props.path, props.cp)
      .filter(cp => cp.visible && !cp.lock)
      .filter(cp => !followers.includes(cp));

    followers.push(...siblings);
    remains = remains.filter(cp => !siblings.includes(cp as any));
  }

  if (enableMagnet) {
    const references: MagnetReference[] = [];

    references.push(...remains.flatMap(source => getHorizontalAndVerticalReferences(source, 0)));
    references.push(...getHorizontalAndVerticalReferences(posBeforeDrag, 0));
    references.push(...getSiblingReferences(props.path, props.cp, followers));

    const [result, magnetRefs] = magnet(cpInUOL, references, app.gc.controlMagnetDistance);
    cpInUOL.setXY(result);
    app.fieldEditor.magnet = magnetRefs;
  } else {
    app.fieldEditor.magnet = [];
  }

  app.history.execute(
    `Move control ${props.cp.uid} with ${followers.length} followers`,
    new DragControls(props.cp, oldCpInUOL, cpInUOL, followers),
    5000
  );

  cpInPx = props.fcc.toPx(cpInUOL);
  event.target.x(cpInPx.x);
  event.target.y(cpInPx.y);
}

class ControlVariables {
  justSelected: boolean = false;
  posBeforeDrag: Vector = new Vector(0, 0);

  constructor() {
    makeAutoObservable(this);
  }
}

class TouchInteractiveHandler extends TouchEventListener {
  private magnetPosition: Vector = new Vector(0, 0);
  private triggerMagnetTimer: NodeJS.Timeout | undefined;
  private initialTime: number = 0;
  enableMagnet: boolean = false;

  constructor(public props: ControlElementProps, private variables: ControlVariables) {
    super();
    makeObservable(this, {
      enableMagnet: observable,
      onKonvaTouchStart: action,
      onKonvaTouchMove: action,
      onKonvaTouchEnd: action
      // props is not observable
    });
  }

  onKonvaTouchStart(event: Konva.KonvaEventObject<TouchEvent>) {
    super.onTouchStart(event.evt);

    const { app } = getAppStores();

    if (!shouldInteract(this.props, event)) return;
    if (!app.fieldEditor.interactWithEntity(this.props.cp, "touch")) return;

    // UX: Select one control point if: touch + target not selected
    if (app.isSelected(this.props.cp) === false) {
      app.setSelected([this.props.cp]);
    }

    this.initialTime = Date.now();
  }

  onKonvaTouchMove(event: Konva.KonvaEventObject<TouchEvent>) {
    super.onTouchMove(event.evt);

    const { app } = getAppStores();

    // UX: Ignore the first touch move event within 100ms
    // In some devices, after the touch start event, the first touch move event is fired immediately with a different
    // touch position
    if (Date.now() - this.initialTime < 100) return;

    // ALGO: No need to check shouldInteract

    if (this.enableMagnet) {
      if (this.pos(this.keys[0]).distance(this.magnetPosition) > 96 && app.fieldEditor.magnet.length === 0) {
        this.enableMagnet = false;
      }
    }

    clearTimeout(this.triggerMagnetTimer);
    this.triggerMagnetTimer = setTimeout(
      action(() => {
        // ALGO: This check is necessary just in case clearTimeout is not called
        if (this.keys.length === 0) return;
        this.enableMagnet = true;
        this.magnetPosition = this.pos(this.keys[0]);
        onDragMoveAnyControl(this.props, this.enableMagnet, this.variables.posBeforeDrag, event);
      }),
      600
    );

    onDragMoveAnyControl(this.props, this.enableMagnet, this.variables.posBeforeDrag, event);
  }

  onKonvaTouchEnd(event: Konva.KonvaEventObject<TouchEvent>) {
    super.onTouchEnd(event.evt);

    // ALGO: No need to check shouldInteract

    clearTimeout(this.triggerMagnetTimer);

    this.enableMagnet = false;
    this.triggerMagnetTimer = undefined;
  }
}

const ControlElement = observer((props: ControlElementProps) => {
  const { app } = getAppStores();

  const variables = useMobxStorage(() => new ControlVariables());
  const tiHandler = useMobxStorage(() => new TouchInteractiveHandler(props, variables));
  tiHandler.props = props;

  function interact(isShiftKey: boolean) {
    variables.posBeforeDrag = props.cp.toVector();

    if (isShiftKey) {
      // UX: Add selected control point if: left click + shift
      // UX: Prevent the control point from being removed when the mouse is released at the same round it is added
      variables.justSelected = app.select(props.cp);
      // UX: Expand the path as the same time to show the control points
      app.addExpanded(props.path);
    } else {
      if (app.isSelected(props.cp) === false) {
        // UX: Select one control point if: left click + not pressing shift and target not selected
        app.setSelected([props.cp]);
        variables.justSelected = false;
      }
    }
  }

  function onMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    if (!shouldInteract(props, event)) return;

    if (evt.button === 0) {
      // left click
      interact(evt.shiftKey);
    } else if (evt.button === 1) {
      // middle click
      // UX: Do not interact with control points if not left click
      event.evt.preventDefault();
      event.target.stopDrag();
    }
  }

  function onMouseClick(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    if (!shouldInteract(props, event)) return;

    // UX: Remove selected entity if: release left click + shift + not being added recently
    if (evt.button === 0 && evt.shiftKey && !variables.justSelected) {
      if (!variables.justSelected) app.unselect(props.cp); // TODO code review
    }
  }

  function onDragMove(event: Konva.KonvaEventObject<DragEvent | TouchEvent>) {
    if (isKonvaTouchEvent(event)) {
      tiHandler.onKonvaTouchMove(event);
    } else {
      onDragMoveAnyControl(props, event.evt.shiftKey, variables.posBeforeDrag, event);
    }
  }

  function onMouseUp(event: Konva.KonvaEventObject<MouseEvent>) {
    if (!shouldInteract(props, event)) return;

    // Nothing to do
  }

  function onWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    const evt = event.evt;

    // UX: Do not interact with control points if it is zooming
    if (!shouldInteract(props, event) || evt.ctrlKey) return;

    // UX: Do not interact with control points if it is not vertical scroll
    if (Math.abs(evt.deltaX) * 1.5 > Math.abs(evt.deltaY)) return;

    // UX: Do not interact with control points if it is panning
    if (!app.fieldEditor.wheelInteraction("change heading value")) return;

    const epc = props.cp as EndControl;
    app.history.execute(
      `Update control ${epc.uid} heading value by scroll wheel`,
      new UpdatePathTreeItems([epc], { heading: epc.heading + evt.deltaY / 10 })
    );
  }

  const lineWidth = props.fcc.heightInPx / 600;
  const cpRadius = (props.fcc.heightInPx / 40) * (app.hoverItem === props.cp.uid ? 1.5 : 1);
  const cpInPx = props.fcc.toPx(props.cp.toVector()); // ALGO: Use toVector() for better performance
  const fillColor = app.isSelected(props.cp) ? "#5C469Cdf" : "#5C469C6f";

  function onClickFirstOrLastControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    onMouseClick(event);

    if (!shouldInteract(props, event)) return;

    // UX: Remove end point from the path, selected and expanded list if: right click
    if (evt.button === 2) {
      const command = new RemovePathsAndEndControls(app.paths, [props.cp as EndControl]);
      app.history.execute(`Remove paths and end controls`, command);
    }
  }

  const isEndControl = props.cp instanceof EndControl;

  return (
    <Portal selector=".selected-controls" enabled={app.isSelected(props.cp)}>
      <Circle
        x={cpInPx.x}
        y={cpInPx.y}
        radius={isEndControl ? cpRadius : cpRadius / 2}
        fill={fillColor}
        draggable
        onTouchStart={event => tiHandler.onKonvaTouchStart(event)}
        onTouchMove={event => tiHandler.onKonvaTouchMove(event)}
        onTouchEnd={event => tiHandler.onKonvaTouchEnd(event)}
        onWheel={isEndControl ? action(onWheel) : undefined}
        onMouseDown={action(onMouseDown)}
        // onMouseMove
        onMouseUp={action(onMouseUp)}
        // onDragStart
        onDragMove={action(onDragMove)}
        // onDragEnd
        onClick={action(onClickFirstOrLastControlPoint)}
      />
      {isEndControl && (
        <Line
          points={[
            cpInPx.x,
            cpInPx.y,
            cpInPx.x + Math.cos(fromHeadingInDegreeToAngleInRadian((props.cp as EndControl).heading)) * cpRadius,
            cpInPx.y - Math.sin(fromHeadingInDegreeToAngleInRadian((props.cp as EndControl).heading)) * cpRadius
          ]}
          stroke="#000"
          strokeWidth={lineWidth}
          listening={false}
        />
      )}
    </Portal>
  );
});

export { ControlElement };

