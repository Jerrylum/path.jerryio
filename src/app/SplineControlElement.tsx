import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { Control, EndPointControl, Vertex } from '../math/path';
import Konva from 'konva';
import { Circle, Line } from 'react-konva';
import { useState } from "react";
import { SplineElementProps } from "./SplineElement";

export interface SplineControlElementProps extends SplineElementProps {
  cp: EndPointControl | Control;
}

const SplineControlElement = observer((props: SplineControlElementProps) => {
  const [justSelected, setJustSelected] = useState(false);
  const [posBeforeDrag, setPosBeforeDrag] = useState(new Vertex(0, 0));

  function onMouseDownControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Do not interact with control points if itself or the path is locked
    if (props.cp.lock || props.path.lock) {
      evt.preventDefault();
      return;
    }

    if (evt.button === 0) { // left click
      setPosBeforeDrag(props.cp.clone());

      if (props.ub.isPressingShift) {
        // UX: Add selected control point if: left click + shift
        // UX: Prevent the control point from being removed when the mouse is released at the same round it is added
        setJustSelected(props.app.addSelected(props.cp.uid));
      } else {
        // UX: Select one control point if: left click + not pressing shift
        props.app.selected = [props.cp.uid];
        setJustSelected(false);
      }
    }
  }

  function onClickControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Do not interact with control points if itself or the path is locked
    if (props.cp.lock || props.path.lock) {
      evt.preventDefault();
      return;
    }

    // UX: Remove selected entity if: release left click + shift + not being added recently
    if (evt.button === 0 && props.ub.isPressingShift && !justSelected) {
      if (!justSelected) props.app.removeSelected(props.cp.uid);
    }
  }

  function onDragControlPoint(event: Konva.KonvaEventObject<DragEvent>) {
    const evt = event.evt;

    // UX: Do not interact with control points if itself or the path is locked
    if (props.cp.lock || props.path.lock) {
      evt.preventDefault();

      const cpInUOL = props.cp.clone();
      const cpInPx = props.cc.toPx(cpInUOL);

      // UX: Set the position of the control point back to the original position
      event.target.x(cpInPx.x);
      event.target.y(cpInPx.y);
      return;
    }

    const oldCpInUOL = props.cp.clone();

    let canvasPos = event.target.getStage()?.container().getBoundingClientRect();
    if (canvasPos === undefined) return;

    // UX: Calculate the position of the control point by the client mouse position
    let cpInPx = new Vertex(evt.clientX - canvasPos.left, evt.clientY - canvasPos.top);
    let cpInUOL = props.cc.toUOL(cpInPx);
    cpInUOL.fixPrecision();
    // first set the position of the control point so we can calculate the position of the follower control points
    props.cp.setXY(cpInUOL);

    // UX: CP 1 should follow CP 0, CP 2 should follow CP 3
    const isMainControl = props.cp instanceof EndPointControl;
    const shouldControlFollow = !props.ub.isPressingCtrl;
    const index = props.path.splines.indexOf(props.spline);
    const isLastOne = index + 1 === props.path.splines.length;
    const isCurve = props.spline.controls.length === 4;
    const isFirstCp = props.spline.first() === props.cp;

    let followers: Control[] = [];
    let others: Control[] = [];
    for (let path of props.paths) {
      for (let control of path.getControlsSet()) {
        if (control === props.cp) continue;
        if (control.visible === false || path.visible === false) continue;
        if (
          (!(control instanceof EndPointControl) && !shouldControlFollow) ||
          (!props.app.isSelected(control.uid)) ||
          (control.lock || path.lock)
        ) {
          others.push(control);
        } else {
          followers.push(control);
        }
      }
    }

    if (isMainControl && shouldControlFollow) {
      if (isCurve) {
        let control = isFirstCp ? props.spline.controls[1] : props.spline.controls[2];
        props.app.addSelected(control.uid);
        if (!followers.includes(control)) followers.push(control);
      }

      const nextSpline = props.path.splines[index + 1];
      if (!isLastOne && !isFirstCp && nextSpline !== undefined && nextSpline.controls.length === 4) {
        let control = nextSpline.controls[1];
        props.app.addSelected(control.uid);
        if (!followers.includes(control)) followers.push(control);
      }
    }

    if (props.ub.isPressingShift) {
      let magnetX = cpInUOL.x;
      let magnetXDistance = Infinity;
      let magnetY = cpInUOL.y;
      let magnetYDistance = Infinity;

      // align to old control points
      others.push(posBeforeDrag.add(new Control(1000, 0)));
      others.push(posBeforeDrag.add(new Control(0, 1000)));

      for (let cp of others) {
        let distance = cp.distance(cpInUOL);
        if (Math.abs(cp.x - cpInUOL.x) < props.app.gc.controlMagnetDistance && distance < magnetXDistance) {
          magnetX = cp.x;
          magnetXDistance = distance;
        }
        if (Math.abs(cp.y - cpInUOL.y) < props.app.gc.controlMagnetDistance && distance < magnetYDistance) {
          magnetY = cp.y;
          magnetYDistance = distance;
        }
      }

      let magnetGuide = new Vertex(Infinity, Infinity);
      if (cpInUOL.x !== magnetX) magnetGuide.x = magnetX;
      if (cpInUOL.y !== magnetY) magnetGuide.y = magnetY;
      props.app.magnet = magnetGuide;

      cpInUOL.x = magnetX;
      cpInUOL.y = magnetY;
    } else {
      props.app.magnet = new Vertex(Infinity, Infinity);
    }

    for (let cp of followers) {
      cp.setXY(cpInUOL.add(cp.subtract(oldCpInUOL)));
    }

    props.cp.setXY(cpInUOL);
    cpInPx = props.cc.toPx(cpInUOL);
    event.target.x(cpInPx.x);
    event.target.y(cpInPx.y);
  }

  function onMouseUpControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Do not interact with control points if itself or the path is locked
    if (props.cp.lock || props.path.lock) {
      evt.preventDefault();
      return;
    }

    props.app.magnet = new Vertex(Infinity, Infinity);
  }

  function onWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    const evt = event.evt;

    // UX: Do not interact with control points if itself or the path is locked
    if (props.cp.lock || props.path.lock) {
      evt.preventDefault();
      return;
    }

    const epc = props.cp as EndPointControl;
    epc.heading += evt.deltaY / 10;
    epc.heading %= 360;
    if (epc.heading < 0) epc.heading += 360;
  }

  const lineWidth = props.cc.pixelWidth / 600;
  const cpRadius = props.cc.pixelWidth / 40;
  const cpInPx = props.cc.toPx(props.cp);
  const fillColor = props.app.isSelected(props.cp.uid) ? "#0000ff8f" : "#0000ff2f";
  const isMainControl = props.cp instanceof EndPointControl;

  function onClickFirstOrLastControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    onClickControlPoint(event);

    // UX: Remove end point from the path, selected and expanded list if: right click
    if (evt.button === 2) {
      const removedControls = props.path.removeSpline(props.cp as EndPointControl);
      for (const control of removedControls) {
        props.app.removeSelected(control.uid);
        props.app.removeExpanded(control.uid);
      }
    }
  }

  return (
    <>
      {
        isMainControl ? (
          <>
            <Line points={[
              cpInPx.x, cpInPx.y,
              cpInPx.x + Math.sin(-((cpInPx as EndPointControl).headingInRadian() - Math.PI)) * cpRadius,
              cpInPx.y + Math.cos(-((cpInPx as EndPointControl).headingInRadian() - Math.PI)) * cpRadius
            ]} stroke="ffffff" strokeWidth={lineWidth} />
            <Circle x={cpInPx.x} y={cpInPx.y} radius={cpRadius} fill={fillColor}
              draggable onDragMove={action(onDragControlPoint)}
              onMouseDown={action(onMouseDownControlPoint)}
              onMouseUp={action(onMouseUpControlPoint)}
              onWheel={onWheel}
              onClick={action(onClickFirstOrLastControlPoint)} />
          </>
        ) : (
          <Circle x={cpInPx.x} y={cpInPx.y} radius={cpRadius / 2} fill={fillColor}
            draggable onDragMove={action(onDragControlPoint)}
            onMouseDown={action(onMouseDownControlPoint)}
            onMouseUp={action(onMouseUpControlPoint)} />
        )
      }

    </>
  )
});

export { SplineControlElement };
