import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { Control, EndPointControl, Vector } from "../core/Path";
import Konva from "konva";
import { Circle, Line } from "react-konva";
import { useState } from "react";
import { SegmentElementProps } from "./SegmentElement";
import { DragControls, RemovePathsAndEndControls } from "../core/Command";
import { useAppStores } from "../core/MainApp";

export interface ControlElementProps extends SegmentElementProps {
  cp: EndPointControl | Control;
  isGrabAndMove: boolean;
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

      const cpInUOL = props.cp.toVector() // ALGO: Use toVector for better performance
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

    // UX: CP 1 should follow CP 0, CP 2 should follow CP 3
    const isMainControl = props.cp instanceof EndPointControl;
    const shouldControlFollow = !evt.ctrlKey;
    const index = props.path.segments.indexOf(props.segment);
    const isLastOne = index + 1 === props.path.segments.length;
    const isCurve = props.segment.controls.length === 4;
    const isFirstCp = props.segment.first === props.cp;

    const followers: Control[] = [];
    const others: Control[] = [];
    for (let path of app.paths) {
      for (let control of path.controls) {
        if (control === props.cp) continue;
        if (control.visible === false || path.visible === false) continue;
        if (
          (!(control instanceof EndPointControl) && !shouldControlFollow) ||
          !app.isSelected(control) ||
          control.lock ||
          path.lock
        ) {
          others.push(control);
        } else {
          followers.push(control);
        }
      }
    }

    if (isMainControl && shouldControlFollow) {
      if (isCurve) {
        const control = isFirstCp ? props.segment.controls[1] : props.segment.controls[2];
        if (control.visible && !control.lock) {
          app.select(control);
          if (!followers.includes(control)) followers.push(control);
        }
      }

      const nextSegment = props.path.segments[index + 1];
      if (!isLastOne && !isFirstCp && nextSegment !== undefined && nextSegment.controls.length === 4) {
        const control = nextSegment.controls[1];
        if (control.visible && !control.lock) {
          app.select(control);
          if (!followers.includes(control)) followers.push(control);
        }
      }
    }

    if (evt.shiftKey) {
      let magnetX = cpInUOL.x;
      let magnetXDistance = Infinity;
      let magnetY = cpInUOL.y;
      let magnetYDistance = Infinity;

      // align to old control points
      others.push(posBeforeDrag.add(new Control(1000, 0)));
      others.push(posBeforeDrag.add(new Control(0, 1000)));

      for (let cp of others) {
        let distance = cp.distance(cpInUOL);
        if (Math.abs(cp.x - cpInUOL.x) < app.gc.controlMagnetDistance && distance < magnetXDistance) {
          magnetX = cp.x;
          magnetXDistance = distance;
        }
        if (Math.abs(cp.y - cpInUOL.y) < app.gc.controlMagnetDistance && distance < magnetYDistance) {
          magnetY = cp.y;
          magnetYDistance = distance;
        }
      }

      const magnetGuide = new Vector(Infinity, Infinity);
      if (cpInUOL.x !== magnetX) magnetGuide.x = magnetX;
      if (cpInUOL.y !== magnetY) magnetGuide.y = magnetY;
      app.magnet = magnetGuide;

      cpInUOL.x = magnetX;
      cpInUOL.y = magnetY;
    } else {
      app.magnet = new Vector(Infinity, Infinity);
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

    app.magnet = new Vector(Infinity, Infinity);
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
      for (const id of command.removedEntities) {
        app.unselect(id);
        app.removeExpanded(id.uid);
      }
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
