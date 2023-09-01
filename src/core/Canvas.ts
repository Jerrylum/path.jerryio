import Konva from "konva";
import { KeyframePos, Path, Vector } from "./Path";

export interface CanvasEntity {
  uid: string;
}

export interface InteractiveEntity extends CanvasEntity {
  lock: boolean;
  visible: boolean;
  name: string;
}

export interface InteractiveEntityParent extends InteractiveEntity {
  children: InteractiveEntity[];
}

export function isKonvaTouchEvent(event: Konva.KonvaEventObject<unknown>): event is Konva.KonvaEventObject<TouchEvent> {
  return !!window.TouchEvent && event.evt instanceof TouchEvent;
}

export function isTouchEvent(event: unknown): event is TouchEvent {
  return !!window.TouchEvent && event instanceof TouchEvent;
}

export function getClientXY(event: DragEvent | MouseEvent | TouchEvent): Vector {
  if (window.TouchEvent && event instanceof TouchEvent) {
    const touch = event.touches[0] || event.changedTouches[0];
    return touch ? new Vector(touch.clientX, touch.clientY) : new Vector(0, 0);
  } else {
    event = event as DragEvent | MouseEvent;
    return new Vector(event.clientX, event.clientY);
  }
}

export class FieldCanvasConverter {
  public halfWidthInPx: number;
  public halfHeightInPx: number;
  public uol2pixel: number; // in pixel/uol
  public pixel2uol: number; // in uol/pixel
  public viewOffset: Vector;

  constructor(
    public widthInPx: number,
    public heightInPx: number,
    public heightInUOL: number,
    public offset: Vector,
    public scale: number,
    public container: HTMLElement | null
  ) {
    this.halfWidthInPx = widthInPx / 2;
    this.halfHeightInPx = heightInPx / 2;
    this.uol2pixel = heightInPx / heightInUOL;
    this.pixel2uol = heightInUOL / heightInPx;
    this.viewOffset = new Vector((widthInPx - heightInPx) / 2, 0);
  }

  toPx<T extends Vector>(inUOL: T): T {
    let rtn = inUOL.clone();
    rtn.x = inUOL.x * this.uol2pixel + this.halfWidthInPx - this.viewOffset.x;
    rtn.y = -inUOL.y * this.uol2pixel + this.halfHeightInPx;
    return rtn;
  }

  toUOL<T extends Vector>(inPx: T): T {
    let rtn = inPx.clone();
    rtn.x = (inPx.x - this.halfWidthInPx + this.viewOffset.x) * this.pixel2uol;
    rtn.y = -(inPx.y - this.halfHeightInPx) * this.pixel2uol;
    return rtn;
  }

  getUnboundedPx(clientXY: Vector, useOffset = true, useScale = true): Vector | undefined {
    const canvasPos = this.container?.getBoundingClientRect();
    if (canvasPos === undefined) return;

    const offset = useOffset ? this.offset.subtract(this.viewOffset) : 0;

    const scale = useScale ? this.scale : 1;

    const rtn = clientXY.subtract(new Vector(canvasPos.left, canvasPos.top));

    // UX: Calculate the position of the control point by the client mouse position
    return rtn.divide(scale).add(offset);
  }

  getUnboundedPxFromNativeEvent(
    event: DragEvent | MouseEvent | TouchEvent,
    useOffset = true,
    useScale = true
  ): Vector | undefined {
    return this.getUnboundedPx(getClientXY(event), useOffset, useScale);
  }

  getUnboundedPxFromEvent(
    event: Konva.KonvaEventObject<DragEvent | MouseEvent | TouchEvent>,
    useOffset = true,
    useScale = true
  ): Vector | undefined {
    return this.getUnboundedPxFromNativeEvent(event.evt, useOffset, useScale);
  }
}

export class GraphCanvasConverter {
  public pointsOnPage: number = 200;
  public pointWidth: number;
  public pointRadius: number;
  public lineWidth: number = 0.5;
  public twoSidePaddingWidth: number;
  public rightPaddingStart: number;
  public axisTitleWidth: number;
  public axisLineTopX: number;
  public bodyHeight: number;
  public axisLineBottomX: number;

  constructor(
    public pixelWidth: number,
    public pixelHeight: number,
    public xOffset: number,
    public path: Path,
    public container: HTMLElement | null
  ) {
    this.pointWidth = pixelWidth / this.pointsOnPage;
    this.pointRadius = this.pointWidth / 2;
    this.twoSidePaddingWidth = this.pointWidth * 14;
    this.rightPaddingStart = this.pixelWidth - this.twoSidePaddingWidth;
    this.axisTitleWidth = this.pointWidth * 12;
    this.axisLineTopX = this.pixelHeight * 0.2;
    this.bodyHeight = this.pixelHeight * 0.6;
    this.axisLineBottomX = this.pixelHeight * 0.8;
  }

  toPxNumber(index: number): number {
    return index * this.pointWidth + this.pointWidth * 14 - this.xOffset;
  }

  toIndexNumber(px: number): number {
    return Math.floor((px + this.xOffset - this.twoSidePaddingWidth) / this.pointWidth);
  }

  toPos(px: Vector): KeyframePos | undefined {
    const x = px.x;
    const y = px.y;

    let index = this.toIndexNumber(x);
    if (index >= this.path.cachedResult.points.length - 2) {
      index = this.path.cachedResult.points.length - 2;
    }
    if (index < 0) {
      index = 0;
    }

    const segmentIndex = this.path.cachedResult.segmentIndexes.findIndex(
      range => range.from <= index && range.to > index
    );
    if (segmentIndex === -1) return;

    const range = this.path.cachedResult.segmentIndexes[segmentIndex];
    const segment = this.path.segments[segmentIndex];

    let xPos = (index - range.from) / (range.to - range.from);
    if (xPos === Infinity || xPos === -Infinity || isNaN(xPos)) return;

    let yPos = 1 - (y - this.axisLineTopX) / (this.axisLineBottomX - this.axisLineTopX);
    if (yPos === Infinity || yPos === -Infinity || isNaN(yPos)) return;
    if (yPos < 0) yPos = 0;
    if (yPos > 1) yPos = 1;

    return { segment, xPos, yPos };
  }

  toPx(pos: KeyframePos): Vector {
    const segment = pos.segment;
    const segmentIndex = this.path.segments.findIndex(s => s === segment);
    const range = this.path.cachedResult.segmentIndexes[segmentIndex];

    const x = range.from + pos.xPos * (range.to - range.from);
    const y = this.axisLineTopX + (1 - pos.yPos) * (this.axisLineBottomX - this.axisLineTopX);

    return new Vector(this.toPxNumber(x), y);
  }
}
