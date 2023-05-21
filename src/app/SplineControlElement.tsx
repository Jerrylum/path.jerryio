import { runInAction, makeAutoObservable } from "mobx"
import { observer } from "mobx-react-lite";
import { Control, EndPointControl, Vertex } from '../math/path';
import { CanvasConfig } from '../math/shape';
import Konva from 'konva';
import { Circle, Line } from 'react-konva';
import { useState } from "react";
import { SplineElementProps } from "./SplineElement";

export interface SplineControlElementProps extends SplineElementProps {
  cp: EndPointControl | Control;
}

export async function addSelected(props: SplineControlElementProps, uid: string) {
  return new Promise<boolean>((resolve, reject) => {
    props.setSelected((selected) => {
      if (selected.includes(uid)) {
        resolve(false);
        return selected;
      } else {
        resolve(true);
        return [...selected, uid];
      }
    });
  });
}

export function SplineControlElement(props: SplineControlElementProps) {
  const [justSelected, setJustSelected] = useState(false);
  const [posBeforeDrag, setPosBeforeDrag] = useState(new Vertex(0, 0));

  function onMouseDownControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    if (props.cp.lock || props.path.lock) {
      evt.preventDefault();
      return;
    }

    if (evt.button === 0) { // left click
      setJustSelected(false);
      setPosBeforeDrag(props.cp.clone());

      if (props.ub.isPressingShift) {
        // add if not
        addSelected(props, props.cp.uid).then((added) => {
          if (added) {
            setJustSelected(true);
          }
        });
      } else {
        // set selection to this control point
        props.setSelected([props.cp.uid]);
      }
    }
  }

  function onClickControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    if (props.cp.lock || props.path.lock) {
      evt.preventDefault();
      return;
    }

    if (evt.button === 0) { // left click
      if (props.ub.isPressingShift) {
        // remove if already selected and it is not being added recently
        props.setSelected((selected) => {
          if (selected.includes(props.cp.uid) && !justSelected) {
            return selected.filter((uid) => uid !== props.cp.uid);
          } else {
            return selected;
          }
        });
      }
    }
  }

  function onDragControlPoint(event: Konva.KonvaEventObject<DragEvent>) {
    const evt = event.evt;

    if (props.cp.lock || props.path.lock) {
      evt.preventDefault();

      const cpInCm = props.cp.clone();
      const cpInPx = props.cc.toPx(cpInCm);

      event.target.x(cpInPx.x);
      event.target.y(cpInPx.y);
      return;
    }

    const oldCpInCm = props.cp.clone();

    let cpInPx = new Vertex(evt.offsetX, evt.offsetY);
    let cpInCm = props.cc.toCm(cpInPx);
    cpInCm.fixPrecision();
    // first set the position of the control point so we can calculate the position of the follower control points
    props.cp.setXY(cpInCm);

    // CP 1 should follow CP 0, CP 2 should follow CP 3
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
          (!props.selected.includes(control.uid)) ||
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
        addSelected(props, control.uid);
        if (!followers.includes(control)) followers.push(control);
      }

      const nextSpline = props.path.splines[index + 1];
      if (!isLastOne && !isFirstCp && nextSpline !== undefined && nextSpline.controls.length === 4) {
        let control = nextSpline.controls[1];
        addSelected(props, control.uid);
        if (!followers.includes(control)) followers.push(control);
      }
    }

    if (props.ub.isPressingShift) {
      let magnetX = cpInCm.x;
      let magnetXDistance = Infinity;
      let magnetY = cpInCm.y;
      let magnetYDistance = Infinity;

      // align to old control points
      others.push(posBeforeDrag.add(new Control(1000, 0)));
      others.push(posBeforeDrag.add(new Control(0, 1000)));

      for (let cp of others) {
        let distance = cp.distance(cpInCm);
        if (Math.abs(cp.x - cpInCm.x) < props.cc.controlMagnetDistance && distance < magnetXDistance) {
          magnetX = cp.x;
          magnetXDistance = distance;
        }
        if (Math.abs(cp.y - cpInCm.y) < props.cc.controlMagnetDistance && distance < magnetYDistance) {
          magnetY = cp.y;
          magnetYDistance = distance;
        }
      }

      let magnetGuide = new Vertex(Infinity, Infinity);
      if (cpInCm.x !== magnetX) magnetGuide.x = magnetX;
      if (cpInCm.y !== magnetY) magnetGuide.y = magnetY;
      props.setMagnet(magnetGuide);

      cpInCm.x = magnetX;
      cpInCm.y = magnetY;
    } else {
      props.setMagnet(new Vertex(Infinity, Infinity));
    }

    for (let cp of followers) {
      cp.setXY(cpInCm.add(cp.subtract(oldCpInCm)));
    }

    props.cp.setXY(cpInCm);
    cpInPx = props.cc.toPx(cpInCm);
    event.target.x(cpInPx.x);
    event.target.y(cpInPx.y);
  }

  function onMouseUpControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    if (props.cp.lock || props.path.lock) {
      evt.preventDefault();
      return;
    }

    props.setMagnet(new Vertex(Infinity, Infinity));
  }

  function onWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    const evt = event.evt;

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
  const fillColor = props.selected.includes(props.cp.uid) ? "#0000ff8f" : "#0000ff2f";
  const isMainControl = props.cp instanceof EndPointControl;

  function onClickFirstOrLastControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    onClickControlPoint(event);
    if (evt.button === 2) { // right click
      let removedControls = props.path.removeSpline(props.cp as EndPointControl);
      let removed = removedControls.map((control) => control.uid);

      props.setSelected((selected) => selected.filter((uid) => !removed.includes(uid)));
      props.setExpanded((expanded) => expanded.filter((uid) => !removed.includes(uid))); // might not be necessary
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
              draggable onDragMove={onDragControlPoint} onMouseDown={onMouseDownControlPoint} onMouseUp={onMouseUpControlPoint} onWheel={onWheel} onClick={onClickFirstOrLastControlPoint} />
          </>
        ) : (
          <Circle x={cpInPx.x} y={cpInPx.y} radius={cpRadius / 2} fill={fillColor}
            draggable onDragMove={onDragControlPoint} onMouseDown={onMouseDownControlPoint} onMouseUp={onMouseUpControlPoint} />
        )
      }

    </>
  )
}
