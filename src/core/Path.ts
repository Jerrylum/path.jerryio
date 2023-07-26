import "reflect-metadata";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsNumber, MinLength, ValidateNested } from "class-validator";
import { observable, makeAutoObservable, makeObservable, computed } from "mobx";
import { ValidateNumber, makeId } from "./Util";
import { PathConfig } from "../format/Config";
import { InteractiveEntity, CanvasEntity, InteractiveEntityParent } from "./Canvas";
import { PointCalculationResult, boundHeading } from "./Calculation";
import { Coordinate, CoordinateWithHeading } from "./Coordinate";

// Not observable
export class Vector implements Coordinate {
  @IsNumber()
  @Expose()
  public x: number;
  @IsNumber()
  @Expose()
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add<T extends Vector>(vector: T): T {
    let rtn = vector.clone() as T;
    rtn.x += this.x;
    rtn.y += this.y;
    return rtn;
  }

  subtract<T extends Vector>(vector: T): T {
    let rtn = vector.clone() as T;
    rtn.x = this.x - rtn.x;
    rtn.y = this.y - rtn.y;
    return rtn;
  }

  multiply<T extends Vector>(vector: T): T {
    let rtn = vector.clone() as T;
    rtn.x *= this.x;
    rtn.y *= this.y;
    return rtn;
  }

  divide<T extends Vector>(vector: T): T {
    let rtn = vector.clone() as T;
    rtn.x = this.x / rtn.x;
    rtn.y = this.y / rtn.y;
    return rtn;
  }

  dot(vector: Vector): number {
    return this.x * vector.x + this.y * vector.y;
  }

  distance(vector: Vector): number {
    return Math.sqrt(Math.pow(this.x - vector.x, 2) + Math.pow(this.y - vector.y, 2));
  }

  interpolate<T extends Vector>(other: T, distance: number): T {
    // "this" as the center
    let rtn = other.clone() as T;
    // use trig to find the angle between the two points
    const angle = Math.atan2(rtn.y - this.y, rtn.x - this.x);
    // use the angle to find the x and y components of the vector
    rtn.x = this.x + distance * Math.cos(angle);
    rtn.y = this.y + distance * Math.sin(angle);
    return rtn;
  }

  mirror<T extends Vector>(other: T): T {
    // "this" as the center
    let rtn = other.clone() as T;
    rtn.x = 2 * this.x - other.x;
    rtn.y = 2 * this.y - other.y;
    return rtn;
  }

  setXY(other: Vector): void {
    this.x = other.x;
    this.y = other.y;
  }

  isWithinArea(from: Vector, to: Vector) {
    return this.x >= from.x && this.x <= to.x && this.y >= from.y && this.y <= to.y;
  }

  clone(): Vector {
    return new Vector(this.x, this.y);
  }

  toVector(): Vector {
    return new Vector(this.x, this.y);
  }
}

// Not observable
export class SamplePoint extends Vector {
  public isLast: boolean = false;

  constructor(
    x: number,
    y: number,
    public delta: number, // distance to the previous point after ratio is applied
    public integral: number, // integral distance from the first point
    public ref: Segment, // The referenced segment
    public t: number, // [0, 1] The step of the sample point
    public heading?: number
  ) {
    super(x, y);
  }

  clone(): SamplePoint {
    return new SamplePoint(this.x, this.y, this.delta, this.integral, this.ref, this.t, this.heading);
  }
}

// Not observable
export class Point extends Vector {
  public isLast: boolean = false;
  public bentRate: number = 0;

  // ALGO: It is possible that the heading is defined and isLast is true but sampleT is not 1.

  constructor(
    x: number,
    y: number,
    public sampleRef: Segment, // The referenced sample segment
    public sampleT: number,
    public speed: number = 0,
    public heading: number | undefined
  ) {
    super(x, y);
  }

  clone(): Point {
    return new Point(this.x, this.y, this.sampleRef, this.sampleT, this.speed, this.heading);
  }
}

// observable class
export class Control extends Vector implements InteractiveEntity {
  @MinLength(10)
  @Expose()
  public uid: string;
  @IsBoolean()
  @Expose()
  public lock: boolean = false;
  @IsBoolean()
  @Expose()
  public visible: boolean = true;

  get name(): string {
    return "Control";
  }

  constructor(x: number, y: number) {
    super(x, y);
    this.uid = makeId(10);

    makeObservable(this, {
      x: observable,
      y: observable,
      lock: observable,
      visible: observable
    });
  }

  clone(): Control {
    return new Control(this.x, this.y);
  }
}

// observable class
export class EndPointControl extends Control implements CoordinateWithHeading {
  @ValidateNumber((num) => num >= 0 && num < 360)
  @Expose({ name: "heading" })
  public heading_: number = 0;

  get name(): string {
    return "End Control";
  }

  constructor(x: number, y: number, heading: number) {
    super(x, y);
    this.heading = heading;
    makeObservable(this, {
      heading_: observable
    });
  }

  get heading(): number {
    return this.heading_;
  }

  set heading(heading: number) {
    this.heading_ = boundHeading(heading);
  }

  clone(): EndPointControl {
    return new EndPointControl(this.x, this.y, this.heading);
  }
}

export interface KeyframePos {
  segment: Segment;
  xPos: number; // [0...1)
  yPos: number; // [0...1]
}

// observable class
export class Keyframe implements CanvasEntity {
  @MinLength(10)
  @Expose()
  public uid: string;
  @ValidateNumber((num) => num >= 0 && num < 1)
  @Expose()
  public xPos: number;
  @ValidateNumber((num) => num >= 0 && num <= 1)
  @Expose()
  public yPos: number;
  @IsBoolean()
  @Expose()
  public followBentRate: boolean;

  constructor(
    xPos: number, // [0...1)
    yPos: number, // [0...1]
    followBentRate: boolean = false
  ) {
    this.uid = makeId(10);
    this.xPos = xPos;
    this.yPos = yPos;
    this.followBentRate = followBentRate;
    makeAutoObservable(this);
  }

  process(pc: PathConfig, responsible: Point[], nextFrame?: Keyframe): void {
    const limitFrom = pc.speedLimit.from;
    const limitTo = pc.speedLimit.to;
    const limitDiff = limitTo - limitFrom;

    const applicationDiff = pc.bentRateApplicableRange.to - pc.bentRateApplicableRange.from;
    const useRatio = limitDiff !== 0 && applicationDiff !== 0;
    const applicationRatio = limitDiff / applicationDiff;

    const yFrom = this.yPos;
    const yTo = nextFrame ? nextFrame.yPos : yFrom;
    const yDiff = yTo - yFrom;

    const length = responsible.length;
    for (let i = 0; i < length; i++) {
      const point = responsible[i];
      const y = yFrom + (yDiff * i) / length; // length - 1 + 1
      let speed = limitFrom + limitDiff * y;

      if (this.followBentRate) {
        const bentRate = point.bentRate;
        if (bentRate < pc.bentRateApplicableRange.from && bentRate !== 0) speed = Math.min(speed, limitFrom);
        else if (bentRate > pc.bentRateApplicableRange.to) speed = Math.min(speed, limitTo);
        else if (useRatio && bentRate !== 0)
          speed = Math.min(speed, limitFrom + (bentRate - pc.bentRateApplicableRange.from) * applicationRatio);
      }

      point.speed = speed;
    }
  }
}

export enum SegmentVariant {
  LINEAR = "linear",
  CUBIC = "cubic"
}

// observable class
export class Segment implements CanvasEntity {
  @ValidateNested()
  @Expose()
  @Type(() => Control, {
    discriminator: {
      property: "__type",
      subTypes: [
        { value: EndPointControl, name: "end-point" },
        { value: Control, name: "control" }
      ]
    },
    keepDiscriminatorProperty: true
  })
  public controls: (EndPointControl | Control)[];
  @ValidateNested()
  @Expose()
  @Type(() => Keyframe)
  public speedProfiles: Keyframe[];
  @MinLength(10)
  @Expose()
  public uid: string;

  constructor(start: EndPointControl, middle: Control[], end: EndPointControl) {
    if (start === undefined) {
      // for serialization
      this.controls = [];
    } else {
      this.controls = [start, ...middle, end];
    }
    this.speedProfiles = [];
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  get first(): EndPointControl {
    return this.controls[0] as EndPointControl;
  }

  set first(point: EndPointControl) {
    this.controls[0] = point;
  }

  get last(): EndPointControl {
    return this.controls[this.controls.length - 1] as EndPointControl;
  }

  set last(point: EndPointControl) {
    this.controls[this.controls.length - 1] = point;
  }

  isLocked(): boolean {
    return this.controls.some(cp => cp.lock);
  }

  isVisible(): boolean {
    return this.controls.some(cp => cp.visible);
  }
}

// observable class
export class Path implements InteractiveEntity, InteractiveEntityParent {
  @ValidateNested()
  @Expose()
  @Type(() => Segment)
  public segments: Segment[];
  @ValidateNested()
  @Expose()
  public pc: PathConfig;
  @MinLength(1)
  @Expose()
  public name: string = "Path";
  @MinLength(10)
  @Expose()
  public uid: string;
  @IsBoolean()
  @Expose()
  public lock: boolean = false;
  @IsBoolean()
  @Expose()
  public visible: boolean = true;

  @computed get cachedResult(): PointCalculationResult {
    return this.pc.format.getPathPoints(this);
  }

  constructor(pc: PathConfig, ...segments: Segment[]) {
    this.segments = segments;
    this.pc = pc;
    this.uid = makeId(10);

    pc.path = this;
    makeAutoObservable(this);
  }

  @computed get controls(): (EndPointControl | Control)[] {
    if (this.segments.length === 0) return [];
    else return [this.segments[0].first, ...this.segments.flatMap(segment => segment.controls.slice(1))];
  }

  @computed get children(): InteractiveEntity[] {
    return this.controls;
  }
}

export type PathTreeItem = Path | EndPointControl | Control;
export type Primary = Path | EndPointControl;
export type Follower = Control;

export function traversal(paths: Path[]): PathTreeItem[] {
  return paths.reduce((acc, path) => {
    return [...acc, path, ...path.controls];
  }, [] as PathTreeItem[]);
}

export function construct(entities: PathTreeItem[]): PathTreeItem[] | undefined {
  const removed: PathTreeItem[] = [];

  let currentPath: Path | undefined;
  let segments: Segment[] = [];
  let first: EndPointControl | undefined;
  let middle: Control[] = [];

  const push = () => {
    if (currentPath !== undefined) {
      currentPath.segments = segments;
      // ALGO: Add dangling controls to removed
      removed.push(...middle);
      if (first && segments.length === 0) removed.push(first);

      segments = [];
      first = undefined;
      middle = [];
    }
  };

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (entity instanceof Path) {
      push();
      currentPath = entity;
    } else if (entity instanceof EndPointControl) {
      if (currentPath === undefined) return undefined;

      if (first !== undefined) {
        if (middle.length < 2) {
          removed.push(...middle);
          middle = []; // No less than 2 controls
        }
        if (middle.length > 2) {
          removed.push(...middle.slice(1, -1));
          middle = [middle[0], middle[middle.length - 1]]; // No more than 2 controls
        }
        segments.push(new Segment(first, middle, entity));
      } else {
        removed.push(...middle);
      }

      first = entity;
      middle = [];
    } else if (entity instanceof Control) {
      if (currentPath === undefined) return undefined;

      middle.push(entity);
    }
  }

  push();

  return removed;
}
