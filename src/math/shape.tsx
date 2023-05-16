import { Vertex } from "./path";



export abstract class Shape {
    abstract render(ctx: CanvasRenderingContext2D): void;
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
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.lineWidth = this.width;
        ctx.strokeStyle = this.color;
        ctx.stroke();
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
        ctx.beginPath();
        ctx.rect(this.start.x, this.start.y, this.end.x - this.start.x, this.end.y - this.start.y);
        ctx.fillStyle = this.color;
        ctx.fill();
        if (this.borderWidth > 0) {
            ctx.lineWidth = this.borderWidth;
            ctx.strokeStyle = this.borderColor;
            ctx.stroke();
        }
    }
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
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();
        if (this.borderWidth > 0) {
            ctx.lineWidth = this.borderWidth;
            ctx.strokeStyle = this.borderColor;
            ctx.stroke();
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
    }
}
