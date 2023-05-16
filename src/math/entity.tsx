import { Spline, Vertex } from "./path";
import { CanvasConfig, Circle } from "./shape";

export interface HitBox {
    mouseDown(pos: Vertex): boolean;
    mouseUp(pos: Vertex): boolean;
    mouseHover(pos: Vertex): boolean;
    mouseDrag(pos: Vertex): boolean;
    mouseClick(pos: Vertex): boolean;
}

export abstract class Entity implements HitBox {
    public cc: CanvasConfig;

    constructor(cc: CanvasConfig) {
        this.cc = cc;
    }

    mouseDown(pos: Vertex): boolean { return false; }
    mouseUp(pos: Vertex): boolean { return false; }
    mouseHover(pos: Vertex): boolean { return false; }
    mouseDrag(pos: Vertex): boolean { return false; }
    mouseClick(pos: Vertex): boolean { return false; }

    abstract render(ctx: CanvasRenderingContext2D): void;
}

export class SplineEntity extends Entity {
    public spline: Spline;
    public control_point_hitboxes: SplineControlPointHitBox[] = [];
    public knot_hitboxes: SplineKnotEntity[] = [];

    constructor(cc: CanvasConfig, spline: Spline) {
        super(cc);
        this.spline = spline;
    }
    
    render(ctx: CanvasRenderingContext2D): void {
        let control_points = this.spline.control_points;

        // draw control points
        for (let cp_in_cm of control_points) {
            let cp_in_px = this.cc.toPx(cp_in_cm);
            let hitbox = new SplineControlPointHitBox(this, cp_in_px);
            hitbox.shape.render(ctx);
            this.control_point_hitboxes.push(hitbox);
        }

        // // draw knots
        // for (let knot_in_cm of this.spline.calculateKnots()) {
        //     let knot_in_px = this.cc.toPx(knot_in_cm);
        //     let hitbox = new SplineKnotEntity();
        //     hitbox.shape = new Circle(knot_in_px, this.cc.pixel_width / 20, "#0000ff5f");
        //     hitbox.shape.render(ctx);
        //     this.knot_hitboxes.push(hitbox);
        // }
    }
}

export class SplineControlPointHitBox implements HitBox {

    shape: Circle;
    entity: SplineEntity;
    control_point: Vertex

    constructor(entity: SplineEntity, control_point: Vertex) {
        this.entity = entity;
        this.control_point = control_point;
        let radius = entity.cc.pixel_width / 40;
        this.shape = new Circle(control_point, radius, "#0000ff0f");
    }

    mouseDown(pos: Vertex): boolean { return false; }
    mouseUp(pos: Vertex): boolean { return false; }
    mouseHover(pos: Vertex): boolean { return false; }
    mouseDrag(pos: Vertex): boolean { return false; }
    mouseClick(pos: Vertex): boolean { return false; }
}

export class SplineKnotEntity implements HitBox {
    mouseDown(pos: Vertex): boolean { return false; }
    mouseUp(pos: Vertex): boolean { return false; }
    mouseHover(pos: Vertex): boolean { return false; }
    mouseDrag(pos: Vertex): boolean { return false; }
    mouseClick(pos: Vertex): boolean { return false; }
}
