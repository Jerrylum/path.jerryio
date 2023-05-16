import { Vertex } from "./path";

export class CanvasConfig {
    public pixel_width: number; // in pixel
    public pixel_height: number; // in pixel
    public field_width: number; // in cm
    public field_height: number; // in cm

    // calculated
    public pixel_width_half: number;
    public pixel_height_half: number;
    public cm_to_pixel: number; // in pixel/cm
    public pixel_to_cm: number; // in cm/pixel

    constructor(pixel_width: number, pixel_height: number, field_width: number, field_height: number) {
        this.pixel_width = pixel_width;
        this.pixel_height = pixel_height;
        this.field_width = field_width;
        this.field_height = field_height;
        this.pixel_width_half = pixel_width / 2;
        this.pixel_height_half = pixel_height / 2;
        this.cm_to_pixel = pixel_width / field_width;
        this.pixel_to_cm = field_width / pixel_width;
    }

    toPx(inCM: Vertex): Vertex {
        return new Vertex(inCM.x * this.cm_to_pixel + this.pixel_width_half, inCM.y * this.cm_to_pixel + this.pixel_height_half);
    }

    toCm(inPx: Vertex): Vertex {
        return new Vertex((inPx.x - this.pixel_width_half) * this.pixel_to_cm, (inPx.y - this.pixel_height_half) * this.pixel_to_cm);
    }
}

export abstract class Shape {    
    public path: Path2D | null;

    abstract render(ctx: CanvasRenderingContext2D): void;

    constructor() {
        this.path = null;
    }
    
    isIntersecting(ctx: CanvasRenderingContext2D, pos: Vertex): boolean {
        return this.path ? ctx.isPointInPath(this.path, pos.x, pos.y) : false;
    }
}

export class Line extends Shape {
    public start: Vertex;
    public end: Vertex;
    public width: number;
    public color: string;

    constructor(start: Vertex, end: Vertex, width: number = 1, color: string = 'black') {
        super();
        this.start = start;
        this.end = end;
        this.width = width;
        this.color = color;
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.path = new Path2D();
        this.path.moveTo(this.start.x, this.start.y);
        this.path.lineTo(this.end.x, this.end.y);
        ctx.lineWidth = this.width;
        ctx.strokeStyle = this.color;
        ctx.stroke(this.path);
    }

}

export class Rectangle extends Shape {
    public start: Vertex;
    public end: Vertex;
    public color: string;
    public borderWidth: number;
    public borderColor: string;

    constructor(start: Vertex, end: Vertex, color: string = 'black', borderWidth = 0, borderColor = 'black') {
        super();
        this.start = start;
        this.end = end;
        this.color = color;
        this.borderWidth = borderWidth;
        this.borderColor = borderColor;
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.path = new Path2D();
        this.path.rect(this.start.x, this.start.y, this.end.x - this.start.x, this.end.y - this.start.y);
        ctx.fillStyle = this.color;
        ctx.fill(this.path);
        if (this.borderWidth > 0) {
            ctx.lineWidth = this.borderWidth;
            ctx.strokeStyle = this.borderColor;
            ctx.stroke(this.path);
        }
    }

    // static method to check 
}

export class Circle extends Shape {
    public center: Vertex;
    public radius: number;
    public color: string;
    public borderWidth: number;
    public borderColor: string;

    constructor(center: Vertex, radius: number, color: string = 'black', borderWidth = 0, borderColor = 'black') {
        super();
        this.center = center;
        this.radius = radius;
        this.color = color;
        this.borderWidth = borderWidth;
        this.borderColor = borderColor;
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.path = new Path2D();
        this.path.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill(this.path);
        if (this.borderWidth > 0) {
            ctx.lineWidth = this.borderWidth;
            ctx.strokeStyle = this.borderColor;
            ctx.stroke(this.path);
        }
    }
}

export class Text extends Shape {
    public text: string;
    public position: Vertex;
    public color: string;
    public font: string;

    constructor(text: string, position: Vertex, color: string = 'black', font: string = '12px sans-serif') {
        super();
        this.text = text;
        this.position = position;
        this.color = color;
        this.font = font;
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.font = this.font;
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.position.x, this.position.y);

        this.path = new Path2D();
        // this.path.rect with estimated width and height, no need to draw the path
        let textWidth = ctx.measureText(this.text).width;
        let textHeight = parseInt(this.font);
        this.path.rect(this.position.x, this.position.y - textHeight, textWidth, textHeight);
    }
}
