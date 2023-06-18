import { Exclude, Expose, Type } from 'class-transformer';
import { observable, makeAutoObservable, makeObservable, computed } from "mobx"
import { makeId } from "../app/Util";
import { GeneralConfig, PathConfig } from "../format/Config";
import { InteractiveEntity, CanvasEntity } from "./Canvas";
import { UnitConverter, UnitOfLength } from './Unit';

import 'reflect-metadata';

export class Vector {

  constructor(public x: number, public y: number) { }

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

  clone(): Vector {
    return new Vector(this.x, this.y);
  }
}

export class Point extends Vector {
  public isLastPointOfSegments: boolean = false;

  constructor(x: number, y: number,
    public delta: number, // distance to the previous point
    public integral: number, // integral distance from the first point
    public speed: number = 0,
    public heading?: number) {
    super(x, y);
  }

  clone(): Point {
    return new Point(this.x, this.y, this.delta, this.integral, this.speed, this.heading);
  }
}

export interface Position extends Vector {
  heading: number; // [0, 360)

  headingInRadian(): number;

  clone(): Position;
}

// observable class
export class Control extends Vector implements InteractiveEntity {
  public uid: string;
  public lock: boolean = false;
  public visible: boolean = true;

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

  isWithinArea(from: Vector, to: Vector) {
    return this.x >= from.x && this.x <= to.x && this.y >= from.y && this.y <= to.y;
  }

  clone(): Control {
    return new Control(this.x, this.y);
  }
}

// observable class
export class EndPointControl extends Control implements Position {
  @Expose({ name: 'heading' })
  public heading_: number = 0;

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
    heading %= 360;
    if (heading < 0) heading += 360;
    this.heading_ = heading;
  }

  headingInRadian(): number {
    return this.heading * Math.PI / 180;
  }

  clone(): EndPointControl {
    return new EndPointControl(this.x, this.y, this.heading);
  }
}

export interface KeyframePos {
  segment: Segment,
  xPos: number, // [0...1)
  yPos: number // [0...1]
}

// observable class
export class Keyframe {
  public uid: string;

  constructor(
    public xPos: number, // [0...1)
    public yPos: number, // [0...1]
    public followCurve: boolean = false) {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  process(pc: PathConfig, responsible: Point[], nextFrame?: Keyframe): void {
    const limitFrom = pc.speedLimit.from;
    const limitTo = pc.speedLimit.to;
    const limitDiff = limitTo - limitFrom;

    const applicationDiff = pc.applicationRange.to - pc.applicationRange.from;
    const useRatio = limitDiff !== 0 && applicationDiff !== 0;
    const applicationRatio = limitDiff / applicationDiff;

    const yFrom = this.yPos;
    const yTo = nextFrame ? nextFrame.yPos : yFrom;
    const yDiff = yTo - yFrom;

    const length = responsible.length;
    for (let i = 0; i < length; i++) {
      const point = responsible[i];
      const y = yFrom + yDiff * i / length; // length - 1 + 1
      let speed = limitFrom + limitDiff * y;

      if (this.followCurve) {
        const delta = point.delta;
        if (delta < pc.applicationRange.from && delta !== 0) speed = Math.min(speed, limitFrom);
        else if (delta > pc.applicationRange.to) speed = Math.min(speed, limitTo);
        else if (useRatio && delta !== 0) speed = Math.min(speed, limitFrom + (delta - pc.applicationRange.from) * applicationRatio);
      }

      point.speed = speed;
    }
  }
}

export enum SegmentVariant {
  LINEAR = 'linear',
  CUBIC = 'cubic',
}

// observable class
export class Segment implements CanvasEntity {
  @Type(() => Control, {
    discriminator: {
      property: '__type',
      subTypes: [
        { value: EndPointControl, name: 'end-point' },
        { value: Control, name: 'control' },
      ],
    },
    keepDiscriminatorProperty: true
  })
  public controls: (EndPointControl | Control)[];
  @Type(() => Keyframe)
  public speedProfiles: Keyframe[];
  public uid: string;

  constructor(start: EndPointControl, middle: Control[], end: EndPointControl) {
    if (start === undefined) { // for serialization
      this.controls = [];
    } else {
      this.controls = [start, ...middle, end];
    }
    this.speedProfiles = [];
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  distance(): number {
    let rtn = 0;

    const n = this.controls.length - 1;
    let prev: Vector = this.controls[0];
    for (let t = 0; t <= 1; t += 0.05) {
      let point = new Vector(0, 0);
      for (let i = 0; i <= n; i++) {
        const bernstein = this.bernstein(n, i, t);
        const controlPoint = this.controls[i];
        // PERFORMANCE: Do not use add() here
        point.x += controlPoint.x * bernstein;
        point.y += controlPoint.y * bernstein;
      }
      rtn += point.distance(prev);
      prev = point;
    }

    return rtn;
  }

  calculatePoints(gc: GeneralConfig, pc: PathConfig, integral = 0): Point[] {
    // ALGO: Calculate the target interval based on the density of points to generate points more than enough
    const targetInterval = new UnitConverter(gc.uol, UnitOfLength.Centimeter).fromAtoB(gc.pointDensity) / 200;

    // The density of points is NOT uniform along the curve
    let points: Point[] = this.calculateBezierCurvePoints(targetInterval, integral);

    points[0].heading = this.first.heading;

    const lastPoint = points[points.length - 1];
    const lastControl = this.last;
    const distance = lastPoint.distance(lastControl);
    const integralDistance = lastPoint.integral + distance;
    const finalPoint = new Point(lastControl.x, lastControl.y, distance, integralDistance, 0, this.last.heading);
    finalPoint.isLastPointOfSegments = true;
    points.push(finalPoint);

    const segmentDeltaRatio = (1 / targetInterval) / ((integralDistance - integral) / gc.pointDensity);
    if (segmentDeltaRatio !== Infinity) {
      for (const point of points) {
        point.delta *= segmentDeltaRatio;
      }
    }

    // At least 2 points are returned
    return points;
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
    return this.controls.some((cp) => cp.lock);
  }

  isVisible(): boolean {
    return this.controls.some((cp) => cp.visible);
  }

  private calculateBezierCurvePoints(interval: number, integral = 0): Point[] {
    let points: Point[] = [];

    // Bezier curve implementation
    let totalDistance = integral;
    let lastPoint: Vector = this.controls[0];

    const n = this.controls.length - 1;
    for (let t = 0; t <= 1; t += interval) {
      let point = new Vector(0, 0);
      for (let i = 0; i <= n; i++) {
        const bernstein = this.bernstein(n, i, t);
        const controlPoint = this.controls[i];
        // PERFORMANCE: Do not use add() here
        point.x += controlPoint.x * bernstein;
        point.y += controlPoint.y * bernstein;
      }
      let delta = point.distance(lastPoint);
      points.push(new Point(point.x, point.y, delta, totalDistance += delta));
      lastPoint = point;
    }

    return points;
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

class IndexRange {
  constructor(public from: number, public to: number) { } // to is exclusive
}

export class KeyframeIndexing {
  constructor(public index: number, public segment: Segment | undefined, public keyframe: Keyframe) { }
}

export interface PointCalculationResult {
  ttd: number; // total travel distance

  points: Point[]; // gen2
  // ALGO: An array of index ranges, the absolute range position in the gen2 points array
  segmentIndexes: IndexRange[];
  // ALGO: An array of keyframe indexes, the absolute position in the gen2 points array
  keyframeIndexes: KeyframeIndexing[];
}

// observable class
export class Path implements InteractiveEntity {
  @Type(() => Segment)
  public segments: Segment[];
  public pc: PathConfig;
  public name: string = "Path";
  public uid: string;
  public lock: boolean = false;
  public visible: boolean = true;

  @Exclude()
  public cachedResult: PointCalculationResult = {
    ttd: 0,
    points: [],
    segmentIndexes: [],
    keyframeIndexes: []
  };

  constructor(pc: PathConfig, firstSegment: Segment) {
    this.segments = [firstSegment];
    this.pc = pc;
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  @computed get controls(): (EndPointControl | Control)[] {
    let rtn: (EndPointControl | Control)[] = [];
    for (let i = 0; i < this.segments.length; i++) {
      let segment = this.segments[i];
      if (i === 0) rtn.push(segment.first);
      for (let j = 1; j < segment.controls.length; j++) {
        rtn.push(segment.controls[j]);
      }
    }
    return rtn;
  }

  private getAllSegmentPoints(gc: GeneralConfig, result: PointCalculationResult): Point[] {
    // ALGO: The density of points is NOT uniform along the curve, and we are using this to decelerate the robot
    const gen1: Point[] = [];
    let pathTTD = 0; // total travel distance
    for (let segment of this.segments) {
      const [firstPoint, ...points] = segment.calculatePoints(gc, this.pc, pathTTD);
      // ALGO: Ignore the first point, it is (too close) the last point of the previous segment
      if (pathTTD === 0) gen1.push(firstPoint); // Except for the first segment
      gen1.push(...points);
      pathTTD = gen1[gen1.length - 1].integral;
    }
    result.ttd = pathTTD;

    return gen1;
  }

  private spacePointsEvenly(gc: GeneralConfig, result: PointCalculationResult, gen1: Point[]) {
    // ALGO: gen1 must have at least 2 points, ttd must be greater than 0
    const targetInterval = 1 / (result.ttd / gc.pointDensity);

    let closestIdx = 1;
    let segmentFirstPointIdx = 0;

    for (let t = 0; t < 1; t += targetInterval) {
      const integral = t * result.ttd;

      let heading: number | undefined;
      let isLastPointOfSegments = false; // flag
      while (gen1[closestIdx].integral < integral) { // ALGO: ClosestIdx never exceeds the array length
        // ALGO: Obtain the heading value if it is available
        // ALGO: the last point with heading and isLastPointOfSegments flag is not looped
        if (gen1[closestIdx].heading !== undefined) heading = gen1[closestIdx].heading;
        isLastPointOfSegments = isLastPointOfSegments || gen1[closestIdx].isLastPointOfSegments;
        closestIdx++;
      }

      const p1 = gen1[closestIdx - 1];
      const p2 = gen1[closestIdx];
      const pRatio = (integral - p1.integral) / (p2.integral - p1.integral);
      const p3X = p1.x + (p2.x - p1.x) * pRatio;
      const p3Y = p1.y + (p2.y - p1.y) * pRatio;
      const p3Delta = p1.delta + (p2.delta - p1.delta) * pRatio;
      const p3 = isNaN(pRatio) ? new Point(p1.x, p1.y, p1.delta, integral, 0, heading) : new Point(p3X, p3Y, p3Delta, integral, 0, heading);

      // ALGO: Create a new segment range if the point is the last point of segments
      if ((p3.isLastPointOfSegments = isLastPointOfSegments) === true) {
        result.segmentIndexes.push(new IndexRange(segmentFirstPointIdx, result.points.length));
        segmentFirstPointIdx = result.points.length;
      }

      result.points.push(p3);
    }
    // ALGO: The last segment is not looped
    result.segmentIndexes.push(new IndexRange(segmentFirstPointIdx, result.points.length));
  }

  private processKeyframes(gc: GeneralConfig, result: PointCalculationResult) {
    // ALGO: result.segmentRanges must have at least x ranges (x = number of segments)
    // ALGO: Create a default keyframe at the beginning of the path with speed = 100%
    const ikf: KeyframeIndexing[] = [new KeyframeIndexing(0, undefined, new Keyframe(0, 1))];

    for (let segmentIdx = 0; segmentIdx < this.segments.length; segmentIdx++) {
      const segment = this.segments[segmentIdx];
      const pointIdxRange = result.segmentIndexes[segmentIdx];
      // ALGO: Assume the keyframes are sorted
      segment.speedProfiles.forEach((kf) => {
        const pointIdx = pointIdxRange.from + Math.floor((pointIdxRange.to - pointIdxRange.from) * kf.xPos);
        ikf.push(new KeyframeIndexing(pointIdx, segment, kf));
      });
    }

    for (let i = 0; i < ikf.length; i++) {
      const current = ikf[i];
      const next = ikf[i + 1];
      const from = current.index;
      const to = next === undefined ? result.points.length : next.index;
      const responsiblePoints = result.points.slice(from, to);

      current.keyframe.process(this.pc, responsiblePoints, next?.keyframe);
    }
    result.keyframeIndexes = ikf.slice(1);
  }

  calculatePoints(gc: GeneralConfig): PointCalculationResult {
    const result: PointCalculationResult = { ttd: 20, points: [], segmentIndexes: [], keyframeIndexes: [] };

    if (this.segments.length === 0) return this.cachedResult = result;

    const gen1 = this.getAllSegmentPoints(gc, result);

    this.spacePointsEvenly(gc, result, gen1);

    this.processKeyframes(gc, result);

    // ALGO: gen2 must have at least 1 points
    // ALGO: The first should have heading information
    result.points[0].heading = gen1[0].heading;

    // ALGO: The final point should be the last end control point in the path
    // ALGO: At this point, we know segments has at least 1 segment
    const lastControl = this.segments[this.segments.length - 1].last;
    // ALGO: No need to calculate delta and integral for the final point, it is always 0
    const finalPoint = new Point(lastControl.x, lastControl.y, 0, 0, 0, lastControl.heading);
    // ALGO: No need to calculate speed for the final point, it is always 0
    result.points.push(finalPoint);

    return this.cachedResult = result;
  }
}
