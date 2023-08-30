import { action, makeAutoObservable } from "mobx";
import { toDerivativeHeading, toHeading, firstDerivative } from "./Calculation";
import { CanvasEntity, FieldCanvasConverter } from "./Canvas";
import { getAppStores } from "./MainApp";
import { Vector } from "./Path";
import { clamp } from "./Util";
import { MagnetReference } from "./Magnet";

export type CanvasEntityInteraction =
  | {
      entity: CanvasEntity;
      type: "touch" | "drag";
    }
  | {
      entity: null;
      type: "start" | "panning";
    };

export class FieldEditor {
  private _offset: Vector = new Vector(0, 0);
  private _scale: number = 1; // 1 = 100%, [1..3]
  private _areaSelection: { from: Vector; to: Vector } | undefined = undefined;
  private _interaction: CanvasEntityInteraction | undefined = undefined;
  private _lastInteraction: CanvasEntityInteraction | undefined = undefined;
  private selectedBefore: string[] = []; // Selected controls before area selection
  private offsetStart: Vector | undefined = undefined;
  private wheelInteractionState: {
    type: "panning" | "change heading value";
    lastTimestamp: number;
  } = { type: "panning", lastTimestamp: 0 };

  fcc!: FieldCanvasConverter;

  tooltipPosition: Vector | undefined = undefined;
  magnet: MagnetReference[] = [];

  constructor() {
    makeAutoObservable(this, { fcc: false });

    // UX: Hide tooltip when the window size changes
    window.addEventListener(
      "resize",
      action(() => (this.tooltipPosition = undefined))
    );
    // UX: Hide tooltip when the user clicks outside of the tooltip
    document.addEventListener("touchstart", event => this.onTouchStartOrMouseDown(event));
    document.addEventListener("mousedown", event => this.onTouchStartOrMouseDown(event));
  }

  private onTouchStartOrMouseDown(event: TouchEvent | MouseEvent) {
    if (this.fcc === undefined) return;
    const fieldParent = this.fcc.container?.parentElement?.parentElement;
    const tooltips = [...(fieldParent?.querySelectorAll("*[role='tooltip']") ?? [])];
    const isUsingTooltip = tooltips.some(tooltip => tooltip.contains(event.target as Node));
    if (isUsingTooltip === false) this.tooltipPosition = undefined;
  }

  startAreaSelection(fromPosInPx: Vector): void {
    // position with offset and scale
    const { app } = getAppStores();

    this._areaSelection = {
      from: fromPosInPx,
      to: fromPosInPx
    };
    this.selectedBefore = [...app.selectedEntityIds];
  }

  updateAreaSelection(toPosInPx: Vector): boolean {
    // position with offset and scale
    const { app } = getAppStores();

    if (this._areaSelection === undefined) return false;
    // UX: Select control point if mouse down on field image

    // UX: Use flushSync to prevent lagging
    // See: https://github.com/reactwg/react-18/discussions/21
    // ReactDOM.flushSync(action(() => (this._areaSelection.to = posInPx)));
    this._areaSelection.to = toPosInPx;

    const from = this.fcc.toUOL(this._areaSelection.from);
    const to = this.fcc.toUOL(toPosInPx);

    const fixedFrom = new Vector(Math.min(from.x, to.x), Math.min(from.y, to.y));
    const fixedTo = new Vector(Math.max(from.x, to.x), Math.max(from.y, to.y));

    // ALGO: Select all controls that are within the area
    const highlighted = app.selectableControls
      .filter(control => control.isWithinArea(fixedFrom, fixedTo))
      .map(cp => cp.uid);

    // UX: select all highlighted controls except the ones that were selected before the area selection
    // outer-excluding-join
    const selected = [...this.selectedBefore, ...highlighted].filter(
      uid => !(this.selectedBefore.includes(uid) && highlighted.includes(uid))
    );

    // remove duplicates
    app.setSelected(Array.from(new Set(selected)));
    return true;
  }

  endAreaSelection(): boolean {
    if (this._areaSelection === undefined) return false;

    this._areaSelection = undefined;
    this.selectedBefore = [];

    return true;
  }

  startGrabAndMove(posInPx: Vector): void {
    // position with scale
    // UX: Move field if: middle click
    this.offsetStart = posInPx;
  }

  grabAndMove(posInPx: Vector): boolean {
    // position with scale
    if (this.isGrabAndMove === false) return false;

    const vec = posInPx.subtract(this.offsetStart!);
    this.offsetStart = posInPx;

    return this.panning(vec);
  }

  endGrabAndMove(): boolean {
    const isGrabbing = this.isGrabAndMove;
    this.offsetStart = undefined;
    return isGrabbing;
  }

  panning(vec: Vector): boolean {
    const newOffset = this.offset.subtract(vec);

    newOffset.x = clamp(
      newOffset.x,
      -(this.fcc.widthInPx / this.scale) + this.fcc.widthInPx * 0.1 + this.fcc.viewOffset.x,
      this.fcc.widthInPx * 0.9 - this.fcc.viewOffset.x
    );
    newOffset.y = clamp(
      newOffset.y,
      -(this.fcc.heightInPx / this.scale) + this.fcc.heightInPx * 0.1,
      this.fcc.heightInPx * 0.9
    );
    this.offset = newOffset;

    // UX: This interaction is prioritized
    this.interaction = { entity: null, type: "panning" };
    return true;
  }

  showRobot(posInPx: Vector): boolean {
    const { app } = getAppStores();

    // UX: Show robot if: alt key is down and no other action is performed
    if (app.gc.showRobot === false) return false;

    if (posInPx === undefined) return false;
    const posInUOL = this.fcc.toUOL(posInPx);

    const interested = app.interestedPath();
    if (interested === undefined) return false;

    const magnetDistance = app.gc.controlMagnetDistance;

    const points = interested.cachedResult.points;

    let closestPoint = undefined;
    let closestDistance = Number.MAX_VALUE;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const distance = point.distance(posInUOL);
      if (distance < closestDistance) {
        closestPoint = point;
        closestDistance = distance;
      }
    }

    if (closestPoint !== undefined && closestDistance < magnetDistance * 4) {
      app.robot.position.setXY(closestPoint);

      const t = closestPoint.sampleT;
      const segment = closestPoint.sampleRef;
      const c0 = segment.first;
      const c3 = segment.last;

      if (app.gc.robotIsHolonomic) {
        const c3Heading = toDerivativeHeading(c0.heading, c3.heading);
        app.robot.position.heading = c0.heading + c3Heading * t;
      } else {
        const heading = toHeading(firstDerivative(closestPoint.sampleRef, closestPoint.sampleT));
        app.robot.position.heading = heading;
      }

      app.robot.position.visible = true;
    }

    return true;
  }

  zooming(variable: number, posInPx: Vector): boolean {
    const oldScale = this.scale;
    const oldOffset = this.offset;

    const newScale = clamp(variable, 0.5, 3);

    // offset is offset in Konva coordinate system (KC)
    // offsetInCC is offset in HTML Canvas coordinate system (CC)
    const offsetInCC = oldOffset.multiply(oldScale).multiply(-1);

    const canvasHalfSizeWithScale = (this.fcc.heightInPx * oldScale) / 2;
    const newCanvasHalfSizeWithScale = (this.fcc.heightInPx * newScale) / 2;

    // UX: Maintain zoom center at mouse pointer
    const fieldCenter = offsetInCC.add(canvasHalfSizeWithScale);
    const newFieldCenter = offsetInCC.add(newCanvasHalfSizeWithScale);
    const relativePos = posInPx.subtract(fieldCenter).divide(oldScale);
    const newPos = newFieldCenter.add(relativePos.multiply(newScale));
    const newOffsetInCC = posInPx.subtract(newPos).add(offsetInCC);
    const newOffsetInKC = newOffsetInCC.multiply(-1).divide(newScale);

    this.scale = newScale;
    this.offset = newOffsetInKC;

    return true;
  }

  zoomToFit() {
    // UX: Scale down the field editor to fit the canvas
    this.scale = Math.min(1, Math.max(0.5, this.fcc.widthInPx / this.fcc.heightInPx));

    // KC is Konva coordinate system (KC)
    // CC is HTML Canvas coordinate system (CC)

    const canvasSize = new Vector(this.fcc.widthInPx, this.fcc.heightInPx);
    const fieldSize = canvasSize.multiply(this.scale);
    const newOffsetInCC = canvasSize.subtract(fieldSize).divide(2);
    const newOffsetInKC = newOffsetInCC.multiply(-1).divide(this.scale);

    this.offset = newOffsetInKC;
  }

  startInteraction() {
    this.interaction = { entity: null, type: "start" };
  }

  interactWithEntity(entity: CanvasEntity, type: "touch" | "drag") {
    const oldIt = this.interaction;
    if (
      oldIt === undefined ||
      (oldIt !== undefined && oldIt.entity === null && oldIt.type === "start") ||
      (oldIt !== undefined && oldIt.entity === entity)
    ) {
      this.interaction = { entity, type };
      return true;
    } else {
      return false;
    }
  }

  endInteraction() {
    this.interaction = undefined;
  }

  wheelInteraction(type: "panning" | "change heading value"): boolean {
    const now = Date.now();

    if (this.wheelInteractionState.type === type) {
      this.wheelInteractionState.lastTimestamp = now;
      return true;
    } else {
      // 300 is the time between two wheel events, it is a magic number
      if (now - this.wheelInteractionState.lastTimestamp < 300) {
        return false;
      } else {
        this.wheelInteractionState.type = type;
        this.wheelInteractionState.lastTimestamp = now;
        return true;
      }
    }
  }

  reset() {
    this._areaSelection = undefined;
    this._lastInteraction = undefined;
    this._interaction = undefined;
    this.selectedBefore = [];
    this.offsetStart = undefined;
    this.tooltipPosition = undefined;
    this.offset = new Vector(0, 0);
    this.scale = 1;
    this.wheelInteractionState = { type: "panning", lastTimestamp: 0 };
  }

  get offset() {
    return this._offset;
  }

  get scale() {
    return this._scale;
  }

  set offset(offset: Vector) {
    this._offset = offset;
  }

  set scale(scale: number) {
    this._scale = clamp(scale, 0.5, 3);
  }

  get areaSelection() {
    return this._areaSelection;
  }

  get isGrabAndMove() {
    return this.offsetStart !== undefined;
  }

  get interaction() {
    return this._interaction;
  }

  get lastInteraction() {
    return this._lastInteraction;
  }

  private set interaction(newIt: CanvasEntityInteraction | undefined) {
    const oldIt = this._interaction;
    if ((oldIt === undefined) !== (newIt === undefined)) {
      this._lastInteraction = oldIt;
      this._interaction = newIt;
    } else if (
      oldIt !== undefined &&
      newIt !== undefined &&
      (oldIt.entity !== newIt.entity || oldIt.type !== newIt.type)
    ) {
      this._lastInteraction = oldIt;
      this._interaction = newIt;
    }
  }
}
