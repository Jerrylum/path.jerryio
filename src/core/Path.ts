import "reflect-metadata";
import { Exclude, Expose, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  Matches,
  MinLength,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
  registerDecorator
} from "class-validator";
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

  add(value: number): Vector;
  add<T extends Vector>(value: T): T;
  add<T extends Vector>(value: number | T): Vector | T;
  add<T extends Vector>(value: number | T): Vector | T {
    if (typeof value === "number") {
      return new Vector(this.x + value, this.y + value);
    } else {
      const rtn = value.clone();
      rtn.setXY(this.x + value.x, this.y + value.y);
      return rtn;
    }
  }

  subtract(value: number): Vector;
  subtract<T extends Vector>(value: T): T;
  subtract<T extends Vector>(value: number | T): Vector | T;
  subtract<T extends Vector>(value: number | T): Vector | T {
    if (typeof value === "number") {
      return new Vector(this.x - value, this.y - value);
    } else {
      const rtn = value.clone();
      rtn.setXY(this.x - value.x, this.y - value.y);
      return rtn;
    }
  }

  multiply(value: number): Vector;
  multiply<T extends Vector>(value: T): T;
  multiply<T extends Vector>(value: number | T): Vector | T;
  multiply<T extends Vector>(value: number | T): Vector | T {
    if (typeof value === "number") {
      return new Vector(this.x * value, this.y * value);
    } else {
      const rtn = value.clone();
      rtn.setXY(this.x * value.x, this.y * value.y);
      return rtn;
    }
  }

  divide(value: number): Vector;
  divide<T extends Vector>(value: T): T;
  divide<T extends Vector>(value: number | T): Vector | T;
  divide<T extends Vector>(value: number | T): Vector | T {
    if (typeof value === "number") {
      return new Vector(this.x / value, this.y / value);
    } else {
      const rtn = value.clone();
      rtn.setXY(this.x / value.x, this.y / value.y);
      return rtn;
    }
  }

  dot(vector: Vector): number {
    return this.x * vector.x + this.y * vector.y;
  }

  distance(vector: Vector): number {
    return Math.sqrt(Math.pow(this.x - vector.x, 2) + Math.pow(this.y - vector.y, 2));
  }

  interpolate<T extends Vector>(other: T, distance: number): T {
    // "this" as the center
    let rtn = other.clone();
    // use trig to find the angle between the two points
    const angle = Math.atan2(rtn.y - this.y, rtn.x - this.x);
    // use the angle to find the x and y components of the vector
    rtn.x = this.x + distance * Math.cos(angle);
    rtn.y = this.y + distance * Math.sin(angle);
    return rtn;
  }

  mirror<T extends Vector>(other: T): T {
    // "this" as the center
    let rtn = other.clone();
    rtn.x = 2 * this.x - other.x;
    rtn.y = 2 * this.y - other.y;
    return rtn;
  }

  setXY(x: number, y: number): void;
  setXY(other: Vector): void;
  setXY(arg0: number | Vector, arg1?: number): void {
    if (arg0 instanceof Vector) {
      this.x = arg0.x;
      this.y = arg0.y;
    } else {
      this.x = arg0;
      this.y = arg1!;
    }
  }

  isWithinArea(from: Vector, to: Vector) {
    return this.x >= from.x && this.x <= to.x && this.y >= from.y && this.y <= to.y;
  }

  clone(): this {
    return new Vector(this.x, this.y) as this;
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

  clone(): this {
    return new SamplePoint(this.x, this.y, this.delta, this.integral, this.ref, this.t, this.heading) as this;
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

  clone(): this {
    return new Point(this.x, this.y, this.sampleRef, this.sampleT, this.speed, this.heading) as this;
  }
}

// observable class
export class Control extends Vector implements InteractiveEntity {
  @Exclude()
  readonly discriminator = "control";

  @Matches(/^[a-zA-Z0-9]+$/)
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

  clone(): this {
    return new Control(this.x, this.y) as this;
  }
}

// observable class
export class EndControl extends Vector implements InteractiveEntity, CoordinateWithHeading {
  @Exclude()
  readonly discriminator = "end-point";

  @Matches(/^[a-zA-Z0-9]+$/)
  @MinLength(10)
  @Expose()
  public uid: string;
  @IsBoolean()
  @Expose()
  public lock: boolean = false;
  @IsBoolean()
  @Expose()
  public visible: boolean = true;
  @ValidateNumber(num => num >= 0 && num < 360)
  @Expose({ name: "heading" })
  public heading_: number = 0;

  get name(): string {
    return "End Control";
  }

  constructor(x: number, y: number, heading: number) {
    super(x, y);
    this.heading = heading;
    this.uid = makeId(10);

    makeObservable(this, {
      x: observable,
      y: observable,
      lock: observable,
      visible: observable,
      heading_: observable
    });
  }

  get heading(): number {
    return this.heading_;
  }

  set heading(heading: number) {
    this.heading_ = boundHeading(heading);
  }

  clone(): this {
    return new EndControl(this.x, this.y, this.heading) as this;
  }
}

export interface KeyframePos {
  segment: Segment;
  xPos: number; // [0...1)
  yPos: number; // [0...1]
}

// observable class
export class Keyframe implements CanvasEntity {
  @Matches(/^[a-zA-Z0-9]+$/)
  @MinLength(10)
  @Expose()
  public uid: string;
  @ValidateNumber(num => num >= 0 && num < 1)
  @Expose()
  public xPos: number;
  @ValidateNumber(num => num >= 0 && num <= 1)
  @Expose()
  public yPos: number;
  @IsBoolean()
  @Expose()
  public followBentRate: boolean;

  constructor(
    xPos: number, // [0...1)
    yPos: number, // [0...1]
    followBentRate: boolean = true
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

export type LinearSegmentControls = [EndControl, EndControl];
export type CubicSegmentControls = [EndControl, Control, Control, EndControl];
export type SegmentControls = LinearSegmentControls | CubicSegmentControls;

// observable class
export class Segment implements CanvasEntity {
  @ValidateSegmentControls()
  @ValidateNested()
  @IsArray()
  @Expose()
  @Type(() => Control, {
    discriminator: {
      property: "__type",
      subTypes: [
        { value: EndControl, name: "end-point" },
        { value: Control, name: "control" }
      ]
    },
    keepDiscriminatorProperty: true
  })
  public controls: SegmentControls;
  @ValidateNested()
  @IsArray()
  @Expose()
  @Type(() => Keyframe)
  public speedProfiles: Keyframe[];
  @Matches(/^[a-zA-Z0-9]+$/)
  @MinLength(10)
  @Expose()
  public uid: string;

  constructor(); // For class-transformer
  constructor(first: EndControl, last: EndControl);
  constructor(first: EndControl, idx1: Control, idx2: Control, last: EndControl);
  constructor(...list: [] | SegmentControls) {
    this.controls = list as SegmentControls;
    this.speedProfiles = [];
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  get first(): EndControl {
    return this.controls[0] as EndControl;
  }

  set first(point: EndControl) {
    this.controls[0] = point;
  }

  get last(): EndControl {
    return this.controls[this.controls.length - 1] as EndControl;
  }

  set last(point: EndControl) {
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
  @IsArray()
  @Expose()
  @Type(() => Segment)
  public segments: Segment[];
  @ValidateNested()
  @IsObject()
  @Expose()
  public pc: PathConfig;
  @MinLength(1)
  @Expose()
  public name: string = "Path";
  @Matches(/^[a-zA-Z0-9]+$/)
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

  @computed get controls(): AnyControl[] {
    if (this.segments.length === 0) return [];
    else return [this.segments[0].first, ...this.segments.flatMap(segment => segment.controls.slice(1))];
  }

  @computed get children(): InteractiveEntity[] {
    return this.controls;
  }
}

export type PathTreeItem = Path | EndControl | Control;
export type AnyControl = EndControl | Control;

export function isPathTreeItem(item: unknown): item is PathTreeItem {
  return item instanceof Path || item instanceof EndControl || item instanceof Control;
}

export function isAnyControl(item: unknown): item is AnyControl {
  return item instanceof EndControl || item instanceof Control;
}

export function traversal(paths: Path[]): PathTreeItem[] {
  return paths.reduce((acc, path) => {
    return [...acc, path, ...path.controls];
  }, [] as PathTreeItem[]);
}

export function construct(entities: PathTreeItem[]): PathTreeItem[] | undefined {
  const removed: PathTreeItem[] = [];

  let currentPath: Path | undefined;
  let segments: Segment[] = [];
  let first: EndControl | undefined;
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
    } else if (entity instanceof EndControl) {
      if (currentPath === undefined) return undefined;

      if (first !== undefined) {
        if (middle.length < 2) {
          removed.push(...middle);
          // No less than 2 controls
          segments.push(new Segment(first, entity));
        } else if (middle.length > 2) {
          removed.push(...middle.slice(1, -1));
          // No more than 2 controls
          segments.push(new Segment(first, middle[0], middle[middle.length - 1], entity));
        } else if (middle.length === 2) {
          segments.push(new Segment(first, middle[0], middle[1], entity));
        } else {
          segments.push(new Segment(first, entity));
        }
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

export function relatedPaths(paths: Path[], items: PathTreeItem[]): Path[] {
  // Returns the paths that contains the items
  paths = [...paths];

  const rtn: Path[] = [];
  for (const item of items) {
    const idx = item instanceof Path ? paths.indexOf(item) : paths.findIndex(path => path.controls.includes(item));
    if (idx === -1) continue;
    rtn.push(paths[idx]);
    paths.splice(idx, 1);
  }
  return rtn;
}

export function ValidateSegmentControls(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      name: "ValidateSegmentControls",
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        validate(array: any, args: ValidationArguments) {
          // check if it is an array, redundant
          if (!(array instanceof Array)) return false;
          // check if the length is 2 or 4
          if (!(array.length === 2 || array.length === 4)) return false;
          // check if it is an array of EndControl | Control, redundant
          if (!array.every(item => item instanceof Control || item instanceof EndControl)) return false;
          // check if the first is EndControl
          if (!(array[0] instanceof EndControl)) return false;
          // check if the last is EndControl
          if (!(array[array.length - 1] instanceof EndControl)) return false;
          // check if the middle is Control
          if (array.length === 4 && array.slice(1, -1).some(item => item instanceof EndControl)) return false;

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `The ${args.property} must be an array of segment controls.`;
        }
      }
    });
  };
}
