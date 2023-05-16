
export class Vertex {

    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add(vector: Vertex): Vertex {
        return new Vertex(this.x + vector.x, this.y + vector.y);
    }

    subtract(vector: Vertex): Vertex {
        return new Vertex(this.x - vector.x, this.y - vector.y);
    }

    multiply(vector: Vertex): Vertex {
        return new Vertex(this.x * vector.x, this.y * vector.y);
    }

    divide(vector: Vertex): Vertex {
        return new Vertex(this.x / vector.x, this.y / vector.y);
    }

    dot(vector: Vertex): number {
        return this.x * vector.x + this.y * vector.y;
    }

    distance(vector: Vertex): number {
        return Math.sqrt(Math.pow(this.x - vector.x, 2) + Math.pow(this.y - vector.y, 2));
    }

    interpolate(vector: Vertex, t: number): Vertex {
        return new Vertex(this.x + (vector.x - this.x) * t, this.y + (vector.y - this.y) * t);
    }
}

export abstract class Edge {

    abstract calculateKnots(): Vertex[];

    abstract first(): Vertex;

    abstract last(): Vertex;
}

export class Spline extends Edge {
    public control_points: Vertex[];

    constructor(control_points: Vertex[]) {
        super();
        // XXX: check if control_points.length >= 2
        this.control_points = control_points;
    }

    calculateKnots(): Vertex[] {
        let knots: Vertex[] = [];

        // Bezier curve implementation
        const n = this.control_points.length - 1;
        for (let t = 0; t <= 1; t += 0.01) {
            let point = new Vertex(0, 0);
            for (let i = 0; i <= n; i++) {
                const bernstein = this.bernstein(n, i, t);
                const controlPoint = this.control_points[i];
                point = point.add(new Vertex(controlPoint.x * bernstein, controlPoint.y * bernstein));
            }
            knots.push(point);
        }

        return knots;
    }

    first(): Vertex {
        return this.control_points[0];
    }

    last(): Vertex {
        return this.control_points[this.control_points.length - 1];
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

export class EdgeList {
    public edges: Edge[];

    constructor(first_edge: Edge) {
        this.edges = [first_edge];
    }

    addLine(end: Vertex): void {
        const last = this.edges[this.edges.length - 1];
        const spline = new Spline([last.last(), end]);
        this.edges.push(spline);
    }

    add4PointsSpline(p3: Vertex): void {
        const last = this.edges[this.edges.length - 1];
        let p0 = last.last();
        let c = last instanceof Spline ? last.control_points[2] : last.first();
        let p1 = c.interpolate(p0, c.distance(p0) * 2);
        let p2 = new Vertex(p3.x, p3.y - 24);
        const spline = new Spline([p0, p1, p2, p3]);
        this.edges.push(spline);
    }
}
