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

export class FieldCanvasConverter {
  public pixelWidthHalf: number;
  public pixelHeightHalf: number;
  public uol2pixel: number; // in pixel/uol
  public pixel2uol: number; // in uol/pixel

  constructor(
    public pixelWidth: number,
    public pixelHeight: number,
    public fieldWidth: number,
    public fieldHeight: number,
    public offset: Vector,
    public scale: number
  ) {
    this.pixelWidthHalf = pixelWidth / 2;
    this.pixelHeightHalf = pixelHeight / 2;
    this.uol2pixel = pixelWidth / fieldWidth;
    this.pixel2uol = fieldWidth / pixelWidth;
  }

  toPx<T extends Vector>(inUOL: T): T {
    let rtn = inUOL.clone() as T;
    rtn.x = inUOL.x * this.uol2pixel + this.pixelWidthHalf;
    rtn.y = -inUOL.y * this.uol2pixel + this.pixelHeightHalf;
    return rtn;
  }

  toUOL<T extends Vector>(inPx: T): T {
    let rtn = inPx.clone() as T;
    rtn.x = (inPx.x - this.pixelWidthHalf) * this.pixel2uol;
    rtn.y = -(inPx.y - this.pixelHeightHalf) * this.pixel2uol;
    return rtn;
  }

  getUnboundedPxFromNativeEvent(
    event: DragEvent | MouseEvent,
    element: HTMLElement | null,
    useOffset = true,
    useScale = true
  ): Vector | undefined {
    const canvasPos = element?.getBoundingClientRect();
    if (canvasPos === undefined) return;

    const offset = useOffset ? this.offset : new Vector(0, 0);

    const scale = useScale ? this.scale : 1;

    const rtn = new Vector(event.clientX - canvasPos.left, event.clientY - canvasPos.top);

    // UX: Calculate the position of the control point by the client mouse position
    return rtn.divide(new Vector(scale, scale)).add(new Vector(offset.x, offset.y));
  }

  getUnboundedPxFromEvent(
    event: Konva.KonvaEventObject<DragEvent | MouseEvent>,
    useOffset = true,
    useScale = true
  ): Vector | undefined {
    return this.getUnboundedPxFromNativeEvent(
      event.evt,
      event.target.getStage()?.container() || null,
      useOffset,
      useScale
    );
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

  constructor(public pixelWidth: number, public pixelHeight: number, public xOffset: number, public path: Path) {
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
