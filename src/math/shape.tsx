import { Vertex } from "./path";

export function makeId(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

export class CanvasConverter {
    public pixelWidth: number; // in pixel
    public pixelHeight: number; // in pixel
    public fieldWidth: number; // in uol
    public fieldHeight: number; // in uol

    // calculated
    public pixelWidthHalf: number;
    public pixelHeightHalf: number;
    public uol2pixel: number; // in pixel/uol
    public pixel2uol: number; // in uol/pixel

    constructor(pixel_width: number, pixel_height: number, field_width: number, field_height: number) {
        this.pixelWidth = pixel_width;
        this.pixelHeight = pixel_height;
        this.fieldWidth = field_width;
        this.fieldHeight = field_height;
        this.pixelWidthHalf = pixel_width / 2;
        this.pixelHeightHalf = pixel_height / 2;
        this.uol2pixel = pixel_width / field_width;
        this.pixel2uol = field_width / pixel_width;
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
