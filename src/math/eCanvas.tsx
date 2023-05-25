import { Vertex } from "./Path";

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

    constructor(public pixelWidth: number, public pixelHeight: number, public fieldWidth: number, public fieldHeight: number) {
        this.pixelWidthHalf = pixelWidth / 2;
        this.pixelHeightHalf = pixelHeight / 2;
        this.uol2pixel = pixelWidth / fieldWidth;
        this.pixel2uol = fieldWidth / pixelWidth;
    }

    toPx<T extends Vertex>(inUOL: T): T {
        let rtn = inUOL.clone() as T;
        rtn.x = inUOL.x * this.uol2pixel + this.pixelWidthHalf;
        rtn.y = -inUOL.y * this.uol2pixel + this.pixelHeightHalf;
        return rtn;
    }

    toUOL<T extends Vertex>(inPx: T): T {
        let rtn = inPx.clone() as T;
        rtn.x = (inPx.x - this.pixelWidthHalf) * this.pixel2uol;
        rtn.y = -(inPx.y - this.pixelHeightHalf) * this.pixel2uol;
        return rtn.fixPrecision() as T;
    }
}
