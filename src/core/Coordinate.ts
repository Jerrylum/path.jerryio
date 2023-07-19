import { boundAngle, boundHeading, fromHeadingInDegreeToAngleInRadian } from "./Calculation";

export interface Coordinate {
  x: number;
  y: number;
}

export interface CoordinateWithHeading extends Coordinate {
  heading: number; // Degree [0, 360)
}

export interface CoordinateWithAngle extends Coordinate {
  angle: number; // Radian [0, 2 * PI)
}

export function isCoordinate(target: any): target is Coordinate {
  return typeof target.x === "number" && typeof target.y === "number";
}

export function isCoordinateWithHeading(target: any): target is CoordinateWithHeading {
  return typeof target.heading === "number" && isCoordinate(target);
}

export function isCoordinateWithAngle(target: any): target is CoordinateWithAngle {
  return typeof target.angle === "number" && isCoordinate(target);
}

export class CartesianPlane {}

// rotate CoordinateWithHeading

export class OriginRotation {
  private theta: number;
  private sin: number;
  private cos: number;

  constructor(readonly origin: CoordinateWithHeading) {
    this.theta = fromHeadingInDegreeToAngleInRadian(boundHeading(-origin.heading + 90));
    this.sin = Math.sin(this.theta);
    this.cos = Math.cos(this.theta);
  }

  convert(target: Coordinate): Coordinate;
  convert(target: CoordinateWithHeading): CoordinateWithHeading;

  convert(
    target: Coordinate | CoordinateWithHeading
  ): Coordinate | CoordinateWithHeading {
    const rtn: any = {
      y: target.x * this.sin + target.y * this.cos,
      x: target.x * this.cos - target.y * this.sin
    };

    if (isCoordinateWithHeading(target)) {
      rtn.heading = boundHeading(target.heading - this.origin.heading);
    }

    return rtn;
  }
}

export function originRotation(origin: CoordinateWithHeading, target: Coordinate) {
  const theta = fromHeadingInDegreeToAngleInRadian(boundHeading(-origin.heading + 90));

  return euclideanRotation(theta, { x: target.x - origin.x, y: target.y - origin.y });
}

export function euclideanRotation(theta: number, target: Coordinate) {
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);

  return {
    y: target.x * sin + target.y * cos,
    x: target.x * cos - target.y * sin
  };
}

