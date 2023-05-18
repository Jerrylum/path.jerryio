import { CanvasConfig } from "./shape";

function makeId(length : number) {
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

export class Vertex {

    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add<T extends Vertex>(vector: T): T {
        let rtn = vector.clone() as T;
        rtn.x += this.x;
        rtn.y += this.y;
        return rtn;
    }

    subtract<T extends Vertex>(vector: T): T {
        let rtn = vector.clone() as T;
        rtn.x = this.x - rtn.x;
        rtn.y = this.y - rtn.y;
        return rtn;
    }

    multiply<T extends Vertex>(vector: T): T {
        let rtn = vector.clone() as T;
        rtn.x *= this.x;
        rtn.y *= this.y;
        return rtn;
    }

    divide<T extends Vertex>(vector: T): T {
        let rtn = vector.clone() as T;
        rtn.x = this.x / rtn.x;
        rtn.y = this.y / rtn.y;
        return rtn;
    }

    dot(vector: Vertex): number {
        return this.x * vector.x + this.y * vector.y;
    }

    distance(vector: Vertex): number {
        return Math.sqrt(Math.pow(this.x - vector.x, 2) + Math.pow(this.y - vector.y, 2));
    }

    mirror<T extends Vertex>(other: T): T {
        // "this" as the center
        let rtn = other.clone() as T;
        rtn.x = 2 * this.x - other.x;
        rtn.y = 2 * this.y - other.y;
        return rtn;
    }

    clone(): Vertex {
        return new Vertex(this.x, this.y);
    }
}

export interface Position extends Vertex {
    heading: number;

    headingInRadian(): number;

    clone(): Position;
}

export class Control extends Vertex {
    public uid: string;

    constructor(x: number, y: number) {
        super(x, y);
        this.uid = makeId(10);
    }

    clone(): Control {
        return new Control(this.x, this.y);
    }
}

export class EndPointControl extends Control implements Position {
    heading: number;

    constructor(x: number, y: number, heading: number) {
        super(x, y);
        this.heading = heading;
    }

    headingInRadian(): number {
        return this.heading * Math.PI / 180;
    }

    clone(): EndPointControl {
        return new EndPointControl(this.x, this.y, this.heading);
    }
}

export class Spline {
    public controls: (EndPointControl | Control)[];
    public uid: string;

    constructor(start: EndPointControl, middle: Control[], end: EndPointControl) {
        this.controls = [start, ...middle, end];
        this.uid = makeId(10);
    }

    distance(): number {
        let rtn = 0;

        const n = this.controls.length - 1;
        let prev: Vertex = this.controls[0];
        for (let t = 0; t <= 1; t += 0.05) {
            let point = new Vertex(0, 0);
            for (let i = 0; i <= n; i++) {
                const bernstein = this.bernstein(n, i, t);
                const controlPoint = this.controls[i];
                point = point.add(new Vertex(controlPoint.x * bernstein, controlPoint.y * bernstein));
            }
            rtn += point.distance(prev);
            prev = point;
        }

        return rtn;
    }

    calculateKnots(cc: CanvasConfig): Vertex[] {
        let knots: Vertex[] = [];

        let distance = this.distance();

        let step = 1 / (distance * cc.knotPerCm);

        // Bezier curve implementation
        const n = this.controls.length - 1;
        for (let t = 0; t <= 1; t += step) { // 0.01
            let point = new Vertex(0, 0);
            for (let i = 0; i <= n; i++) {
                const bernstein = this.bernstein(n, i, t);
                const controlPoint = this.controls[i];
                point = point.add(new Vertex(controlPoint.x * bernstein, controlPoint.y * bernstein));
            }
            knots.push(point);
        }

        return knots;
    }

    first(): EndPointControl {
        return this.controls[0] as EndPointControl;
    }

    setFirst(point: EndPointControl): void {
        this.controls[0] = point;
    }

    last(): EndPointControl {
        return this.controls[this.controls.length - 1] as EndPointControl;
    }

    setLast(point: EndPointControl): void {
        this.controls[this.controls.length - 1] = point;
    }

    private bernstein(n: number, i: number, t: number): number {
        return this.binomial(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i);
    }

    private binomial(n: number, k: number): number {
        let coeff = 1;
        for (let i = n - k + 1; i <= n; i++) {
            coeff *= i;
        }
        for (let i = 1; i <= k; i++) {
            coeff /= i;
        }
        return coeff;
    }
}

export class Path {
    public splines: Spline[];
    public name: string = "Path";
    public uid: string;

    constructor(first_spline: Spline) {
        this.splines = [first_spline];
        this.uid = makeId(10);
    }

    getControlsSet(): (EndPointControl | Control)[] {
        let rtn: (EndPointControl | Control)[] = [];
        for (let i = 0; i < this.splines.length; i++) {
            let spline = this.splines[i];
            if (i === 0) rtn.push(spline.first());
            for (let j = 1; j < spline.controls.length; j++) {
                rtn.push(spline.controls[j]);
            }
        }
        return rtn;
    }

    addLine(end: EndPointControl): void {
        let spline;
        if (this.splines.length === 0) {
            spline = new Spline(new EndPointControl(0, 0, 0), [], end);
        } else {
            const last = this.splines[this.splines.length - 1];
            spline = new Spline(last.last(), [], end);
        }
        this.splines.push(spline);
    }

    add4ControlsCurve(p3: EndPointControl): void {
        let spline;
        if (this.splines.length === 0) {
            let p0 = new EndPointControl(0, 0, 0);
            let p1 = new Control(p0.x, p0.y + 24);
            let p2 = new Control(p3.x, p3.y - 24);
            spline = new Spline(p0, [p1, p2], p3);
        } else {
            const last = this.splines[this.splines.length - 1];
            let p0 = last.last();
            let c = last.controls.length < 4 ? last.controls[0] : last.controls[2];
            let p1 = p0.mirror(new Control(c.x, c.y));
            let p2 = p0.divide(new Control(2, 2)).add(p3.divide(new Control(2, 2)));

            spline = new Spline(p0, [p1, p2], p3);
        }
        this.splines.push(spline);
    }

    changeTo4ControlsCurve(spline: Spline) {
        let index = this.splines.indexOf(spline);
        let found = index !== -1;
        if (!found) return;

        let prev: Spline | null = null;
        if (index > 0) {
            prev = this.splines[index - 1];
        }

        let next: Spline | null = null;
        if (index + 1 < this.splines.length) {
            next = this.splines[index + 1];
        }

        let p0 = spline.first();
        let p3 = spline.last();

        let p1: Control;
        if (prev !== null) {
            p1 = p0.mirror(prev.controls[prev.controls.length - 2]);
            // ensure is a control point (not an end point)
            p1 = new Control(p1.x, p1.y);
        } else {
            p1 = p0.divide(new Control(2, 2)).add(p3.divide(new Control(2, 2)));
        }

        let p2;
        if (next !== null) {
            p2 = p3.mirror(next.controls[1]);
        } else {
            p2 = p0.divide(new Control(2, 2)).add(p3.divide(new Control(2, 2)));
        }

        spline.controls = [p0, p1, p2, p3];
    }

    changeToLine(spline: Spline) {
        spline.controls.splice(1, spline.controls.length - 2);
    }

    splitSpline(spline: Spline, point: EndPointControl): void {
        let index = this.splines.indexOf(spline);
        let found = index !== -1;
        if (!found) return;

        let cp_count = spline.controls.length;
        if (cp_count === 2) {
            let last = spline.last();
            spline.setLast(point);
            let new_spline = new Spline(point, [], last);
            this.splines.splice(index + 1, 0, new_spline);
        } else if (cp_count === 4) {
            let p0 = spline.controls[0] as EndPointControl;
            let p1 = spline.controls[1];
            let p2 = spline.controls[2];
            let p3 = spline.controls[3] as EndPointControl;

            let a = p1.divide(new Control(2, 2)).add(point.divide(new Control(2, 2)));
            let b = point;
            let c = p2.divide(new Control(2, 2)).add(point.divide(new Control(2, 2)));
            spline.controls = [p0, p1, a, b];
            let new_spline = new Spline(b, [c, p2], p3);
            this.splines.splice(index + 1, 0, new_spline);
        }
    }

    removeSplineByFirstOrLastControlPoint(point: EndPointControl): void {
        for (let i = 0; i < this.splines.length; i++) {
            let spline = this.splines[i];
            if (spline.first() === point) { // pointer comparison
                if (i > 0) {
                    let prev = this.splines[i - 1];
                    prev.setLast(spline.last()); // pointer assignment
                }
                this.splines.splice(i, 1);
                return;
            } else if (i + 1 === this.splines.length && spline.last() === point) { // pointer comparison
                this.splines.splice(i, 1);
                return;
            }
        }
    }
}
