import { Vertex } from "./path";

export class CanvasConfig {
    public pixelWidth: number; // in pixel
    public pixelHeight: number; // in pixel
    public fieldWidth: number; // in cm
    public fieldHeight: number; // in cm
    public knotPerCm: number = 0.25;
    public controlMagnetDistance: number = 5; // in cm

    // calculated
    public pixelWidthHalf: number;
    public pixelHeightHalf: number;
    public cm2pixel: number; // in pixel/cm
    public pixel2cm: number; // in cm/pixel

    constructor(pixel_width: number, pixel_height: number, field_width: number, field_height: number) {
        this.pixelWidth = pixel_width;
        this.pixelHeight = pixel_height;
        this.fieldWidth = field_width;
        this.fieldHeight = field_height;
        this.pixelWidthHalf = pixel_width / 2;
        this.pixelHeightHalf = pixel_height / 2;
        this.cm2pixel = pixel_width / field_width;
        this.pixel2cm = field_width / pixel_width;
    }

    toPx<T extends Vertex>(inCM: T): T {
        // return new Vertex(inCM.x * this.cm2pixel + this.pixelWidthHalf, -inCM.y * this.cm2pixel + this.pixelHeightHalf);
        let rtn = inCM.clone() as T;
        rtn.x = inCM.x * this.cm2pixel + this.pixelWidthHalf;
        rtn.y = -inCM.y * this.cm2pixel + this.pixelHeightHalf;
        return rtn;
    }

    toCm<T extends Vertex>(inPx: T): T {
        //     return new Vertex((inPx.x - this.pixelWidthHalf) * this.pixel2cm, -(inPx.y - this.pixelHeightHalf) * this.pixel2cm);
        let rtn = inPx.clone() as T;
        rtn.x = (inPx.x - this.pixelWidthHalf) * this.pixel2cm;
        rtn.y = -(inPx.y - this.pixelHeightHalf) * this.pixel2cm;
        return rtn.fixPrecision() as T;
    }
}
