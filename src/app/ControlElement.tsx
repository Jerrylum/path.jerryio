import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { Control, EndPointControl, Path, Vector } from "../core/Path";
import Konva from "konva";
import { Circle, Line } from "react-konva";
import { useState } from "react";
import { SegmentElementProps } from "./SegmentElement";
import { DragControls, RemovePathsAndEndControls } from "../core/Command";
import { useAppStores } from "../core/MainApp";
import { MagnetReference, findClosestPointOnLine, findLinesIntersection, toHeading } from "../core/Calculation";

export interface ControlElementProps extends SegmentElementProps {
  cp: EndPointControl | Control;
  isGrabAndMove: boolean;
}

function getFollowersAndRemaining(
  paths: Path[],
  target: EndPointControl | Control,
  selected: string[],
  includeControl: boolean
): [Control[], Control[]] {
  const followers: Control[] = [];
  const remaining: Control[] = [];
  for (let path of paths) {
    for (let control of path.controls) {
      if (control === target) continue;
      if (control.visible === false || path.visible === false) continue;
      if (
        (!(control instanceof EndPointControl) && !includeControl) ||
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

function getSiblingControls(path: Path, target: EndPointControl): Control[] {
  const controls = path.controls;
  const idx = controls.indexOf(target);
  if (idx === -1) return [];

  const prev: EndPointControl | Control | undefined = controls[idx - 1];
  const next: EndPointControl | Control | undefined = controls[idx + 1];

  const siblingControls: Control[] = [];
  if (prev instanceof Control && prev instanceof EndPointControl === false) siblingControls.push(prev);
  if (next instanceof Control && next instanceof EndPointControl === false) siblingControls.push(next);

  return siblingControls;
}

function getSiblingEndControlsAndControls(
  path: Path,
  target: EndPointControl | Control
): (EndPointControl | Control)[] {
  const controls = path.controls;
  const idx = controls.indexOf(target);
  if (idx === -1) return [];

  const sibling: (EndPointControl | Control)[] = [];

  // for loop, push until encount EndPointControl
  for (let i = idx - 1; i >= 0; i--) {
    const control = controls[i];
    sibling.push(control);
    if (control instanceof EndPointControl) {
      break;
    }
  }

  for (let i = idx + 1; i < controls.length; i++) {
    const control = controls[i];
    sibling.push(control);
    if (control instanceof EndPointControl) {
      break;
    }
  }

  return sibling;
}

function findClosetReference(target: Vector, refs: MagnetReference[]): [Vector, MagnetReference | undefined] {
  let closetPos: Vector | undefined;
  let closetDistance: number = Infinity;
  let closetRef: MagnetReference | undefined;

  for (const ref of refs) {
    const result = findClosestPointOnLine(ref.source, ref.heading, target);
    const distance = target.distance(result);
    if (distance < closetDistance) {
      closetPos = result;
      closetDistance = distance;
      closetRef = ref;
    }
  }

  return [closetPos ?? target, closetRef];
}

function magnet(
  target: Vector,
  refs: MagnetReference[],
  threshold: number
): [Vector, [MagnetReference | undefined, MagnetReference | undefined]] {
  const [result1, result1Ref] = findClosetReference(target, refs);
  if (result1Ref !== undefined) {
    const [, result2Ref] = findClosetReference(
      result1,
      refs.filter(ref => ref !== result1Ref)
    );

    if (result2Ref !== undefined) {
      const result3 = findLinesIntersection(
        result1Ref.source,
        result1Ref.heading,
        result2Ref.source,
        result2Ref.heading
      );

      if (result3 !== undefined && result3.distance(target) < threshold) {
        return [result3, [result1Ref, result2Ref]];
      }
    }
  }

  if (result1Ref !== undefined && result1.distance(target) < threshold) {
    return [result1, [result1Ref, undefined]];
  } else {
    return [target, [undefined, undefined]];
  }
}

const ControlElement = observer((props: ControlElementProps) => {
  const { app } = useAppStores();

  const [justSelected, setJustSelected] = useState(false);
  const [posBeforeDrag, setPosBeforeDrag] = useState(new Vector(0, 0));

  function shouldInteract(event: Konva.KonvaEventObject<MouseEvent>): boolean {
    const evt = event.evt;

    // UX: Do not interact with control points if itself or the path is locked
    // UX: Do not interact with control points if middle click
    if (props.cp.lock || props.path.lock || props.isGrabAndMove) {
      evt.preventDefault();
      event.target.stopDrag();
      return false;
    }

    return true;
  }

  function onMouseDownControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    if (!shouldInteract(event)) return;

    if (evt.button === 0) {
      // left click
      setPosBeforeDrag(props.cp.clone());

      if (evt.shiftKey) {
        // UX: Add selected control point if: left click + shift
        // UX: Prevent the control point from being removed when the mouse is released at the same round it is added
        setJustSelected(app.select(props.cp));
        // UX: Expand the path as the same time to show the control points
        app.addExpanded(props.path);
      } else {
        // UX: Select one control point if: left click + not pressing shift
        app.setSelected([props.cp]);
        setJustSelected(false);
      }
    } else if (evt.button === 1) {
      // middle click
      // UX: Do not interact with control points if not left click
      event.target.stopDrag();
    }
  }

  function onClickControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    if (!shouldInteract(event)) return;

    // UX: Remove selected entity if: release left click + shift + not being added recently
    if (evt.button === 0 && evt.shiftKey && !justSelected) {
      if (!justSelected) app.unselect(props.cp); // TODO code review
    }
  }

  function onDragControlPoint(event: Konva.KonvaEventObject<DragEvent>) {
    const evt = event.evt;

    // UX: Do not interact with control points if itself or the path is locked
    if (props.cp.lock || props.path.lock) {
      evt.preventDefault();

      const cpInUOL = props.cp.toVector(); // ALGO: Use toVector for better performance
      const cpInPx = props.fcc.toPx(cpInUOL);

      // UX: Set the position of the control point back to the original position
      event.target.x(cpInPx.x);
      event.target.y(cpInPx.y);
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

    const [followers, remains] = getFollowersAndRemaining(app.paths, props.cp, app.selectedEntityIds, isControlFollow);

    if (props.cp instanceof EndPointControl && isControlFollow) {
      getSiblingControls(props.path, props.cp)
        .filter(cp => cp.visible && !cp.lock)
        .forEach(cp => {
          app.select(cp);
          if (!followers.includes(cp)) followers.push(cp);
        });
    }

    function getSiblingReference(c1: Control, c2: Control): MagnetReference[] {
      if (c1.visible && !followers.includes(c1) && c2.visible && !followers.includes(c2)) {
        return [{ source: c1, heading: toHeading(c2.subtract(c1.toVector())) }];
      } else {
        return [];
      }
    }

    if (evt.shiftKey) {
      const references: MagnetReference[] = [posBeforeDrag, ...remains].flatMap(source => {
        return [{ source, heading: 0 } as MagnetReference, { source, heading: 90 } as MagnetReference];
      });

      references.push(
        ...getSiblingEndControlsAndControls(props.path, props.cp)
          .filter(cp => cp.visible && !followers.includes(cp))
          .flatMap(source => {
            return [{ source, heading: 45 } as MagnetReference, { source, heading: 135 } as MagnetReference];
          })
      );

      const controls = props.path.controls;
      const idx = controls.indexOf(props.cp);
      if (idx >= 2) {
        references.push(...getSiblingReference(controls[idx - 1], controls[idx - 2]));
      }
      if (idx < controls.length - 2) {
        references.push(...getSiblingReference(controls[idx + 1], controls[idx + 2]));
      }

      const [result, magnetRefs] = magnet(cpInUOL, references, app.gc.controlMagnetDistance);
      cpInUOL.setXY(result);
      app.magnet = magnetRefs;
    } else {
      app.magnet = [undefined, undefined];
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

  function onMouseUpControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    if (!shouldInteract(event)) return;

    app.magnet = [undefined, undefined];
  }

  function onWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    const evt = event.evt;

    // UX: Do not interact with control points if it is zooming
    if (!shouldInteract(event) || evt.ctrlKey) return;

    const epc = props.cp as EndPointControl;
    epc.heading += evt.deltaY / 10;
    epc.heading %= 360;
    if (epc.heading < 0) epc.heading += 360;
  }

  const lineWidth = props.fcc.pixelWidth / 600;
  const cpRadius = props.fcc.pixelWidth / 40;
  const cpInPx = props.fcc.toPx(props.cp.toVector()); // ALGO: Use toVector() for better performance
  const fillColor = app.isSelected(props.cp) ? "#5C469Cdf" : "#5C469C6f";
  const isMainControl = props.cp instanceof EndPointControl;

  function onClickFirstOrLastControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    onClickControlPoint(event);

    if (!shouldInteract(event)) return;

    // UX: Remove end point from the path, selected and expanded list if: right click
    if (evt.button === 2) {
      const command = new RemovePathsAndEndControls(app.paths, [props.cp as EndPointControl]);
      app.history.execute(`Remove paths and end controls`, command);
    }
  }

  return (
    <>
      {isMainControl ? (
        <>
          <Circle
            x={cpInPx.x}
            y={cpInPx.y}
            radius={cpRadius}
            fill={fillColor}
            draggable
            onDragMove={action(onDragControlPoint)}
            onMouseDown={action(onMouseDownControlPoint)}
            onMouseUp={action(onMouseUpControlPoint)}
            onWheel={action(onWheel)}
            onClick={action(onClickFirstOrLastControlPoint)}
          />
          <Line
            points={[
              cpInPx.x,
              cpInPx.y,
              cpInPx.x + Math.sin(-((props.cp as EndPointControl).headingInRadian() - Math.PI)) * cpRadius,
              cpInPx.y + Math.cos(-((props.cp as EndPointControl).headingInRadian() - Math.PI)) * cpRadius
            ]}
            stroke="ffffff"
            strokeWidth={lineWidth}
          />
        </>
      ) : (
        <Circle
          x={cpInPx.x}
          y={cpInPx.y}
          radius={cpRadius / 2}
          fill={fillColor}
          draggable
          onDragMove={action(onDragControlPoint)}
          onMouseDown={action(onMouseDownControlPoint)}
          onMouseUp={action(onMouseUpControlPoint)}
          onClick={action(onClickControlPoint)}
        />
      )}
    </>
  );
});

export { ControlElement };

