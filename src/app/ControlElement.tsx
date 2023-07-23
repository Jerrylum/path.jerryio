import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { Control, EndPointControl, Path, Vector } from "../core/Path";
import Konva from "konva";
import { Circle, Line } from "react-konva";
import { useState } from "react";
import { SegmentElementProps } from "./SegmentElement";
import { DragControls, RemovePathsAndEndControls, UpdatePathTreeItems } from "../core/Command";
import { useAppStores } from "../core/MainApp";
import { boundHeading, fromHeadingInDegreeToAngleInRadian, toHeading } from "../core/Calculation";
import { MagnetReference, magnet } from "../core/Magnet";

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

function getHorizontalAndVerticalReferences(source: Vector, originHeading: number): MagnetReference[] {
  return [
    { source, heading: boundHeading(originHeading) },
    { source, heading: boundHeading(originHeading + 90) }
  ];
}

function getSiblingReferences(path: Path, target: EndPointControl | Control, followers: Control[]): MagnetReference[] {
  const references: MagnetReference[] = [];

  const controls = path.controls;
  const idx = controls.indexOf(target);

  function findEndControl(step: number): EndPointControl | undefined {
    for (let i = idx + step; i >= 0 && i < controls.length; i += step) {
      if (controls[i] instanceof EndPointControl) return controls[i] as EndPointControl;
    }
    return undefined;
  }

  function func(c1: Control, c2: Control) {
    if (c1.visible && !followers.includes(c1) && c2.visible && !followers.includes(c2)) {
      references.push({ source: c1, heading: toHeading(c2.subtract(c1.toVector())) });
    }
  }

  if (idx >= 2) func(controls[idx - 1], controls[idx - 2]);
  if (idx < controls.length - 2) func(controls[idx + 1], controls[idx + 2]);

  const prevEndControl = findEndControl(-1);
  if (prevEndControl) references.push({ source: prevEndControl, heading: prevEndControl.heading });
  const nextEndControl = findEndControl(+1);
  if (nextEndControl) references.push({ source: nextEndControl, heading: nextEndControl.heading });

  return references;
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

    if (evt.shiftKey) {
      const references: MagnetReference[] = [];

      references.push(...remains.flatMap(source => getHorizontalAndVerticalReferences(source, 0)));
      references.push(...getHorizontalAndVerticalReferences(posBeforeDrag, 0));
      references.push(...getSiblingReferences(props.path, props.cp, followers));

      const [result, magnetRefs] = magnet(cpInUOL, references, app.gc.controlMagnetDistance);
      cpInUOL.setXY(result);
      app.magnet = magnetRefs;
    } else {
      app.magnet = [];
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

    // Nothing to do
  }

  function onWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    const evt = event.evt;

    // UX: Do not interact with control points if it is zooming
    if (!shouldInteract(event) || evt.ctrlKey) return;

    const epc = props.cp as EndPointControl;
    app.history.execute(
      `Update control ${epc.uid} heading value`,
      new UpdatePathTreeItems([epc], { heading: epc.heading + evt.deltaY / 10 })
    );
  }

  const lineWidth = props.fcc.pixelWidth / 600;
  const cpRadius = props.fcc.pixelWidth / 40;
  const cpInPx = props.fcc.toPx(props.cp.toVector()); // ALGO: Use toVector() for better performance
  const fillColor = app.isSelected(props.cp) ? "#5C469Cdf" : "#5C469C6f";

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
      {props.cp instanceof EndPointControl ? (
        <>
          <Circle
            x={cpInPx.x}
            y={cpInPx.y}
            radius={cpRadius}
            fill={fillColor}
            draggable
            stroke={app.hoverItem === props.cp.uid ? "#5C469Cdf" : undefined}
            strokeWidth={lineWidth * 2}
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
              cpInPx.x + Math.cos(fromHeadingInDegreeToAngleInRadian(props.cp.heading)) * cpRadius,
              cpInPx.y - Math.sin(fromHeadingInDegreeToAngleInRadian(props.cp.heading)) * cpRadius
            ]}
            stroke="#000"
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
          stroke={app.hoverItem === props.cp.uid ? "#5C469Cdf" : undefined}
          strokeWidth={lineWidth * 2}
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

