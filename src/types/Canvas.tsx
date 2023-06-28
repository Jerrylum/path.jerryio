import Konva from "konva";
import { Vector } from "./Path";

export interface CanvasEntity {
  uid: string;
}

export interface InteractiveEntity extends CanvasEntity {
  lock: boolean;
  visible: boolean;
}

export class CanvasConverter {
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
