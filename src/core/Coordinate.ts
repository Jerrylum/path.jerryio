import { boundHeading, fromHeadingInDegreeToAngleInRadian } from "./Calculation";

export interface Coordinate {
  x: number;
  y: number;
}

export interface CoordinateWithHeading extends Coordinate {
  heading: number; // Degree [0, 360)
}

export function isCoordinate(target: any): target is Coordinate {
  return typeof target.x === "number" && typeof target.y === "number";
}

export function isCoordinateWithHeading(target: any): target is CoordinateWithHeading {
  return typeof target.heading === "number" && isCoordinate(target);
}

export class EuclideanTransformation {
  private theta: number;
  private sin: number;
  private cos: number;

  constructor(readonly origin: CoordinateWithHeading) {
    this.theta = fromHeadingInDegreeToAngleInRadian(boundHeading(-origin.heading + 90));
    this.sin = Math.sin(this.theta);
    this.cos = Math.cos(this.theta);
  }

  transform(target: Coordinate): Coordinate;
  transform(target: CoordinateWithHeading): CoordinateWithHeading;

  transform(target: Coordinate | CoordinateWithHeading): Coordinate | CoordinateWithHeading {
    const rtn: any = {
      y: (target.x - this.origin.x) * this.sin + (target.y - this.origin.y) * this.cos,
      x: (target.x - this.origin.x) * this.cos - (target.y - this.origin.y) * this.sin
    };

    if (isCoordinateWithHeading(target)) {
      rtn.heading = boundHeading(target.heading - this.origin.heading);
    }

    return rtn;
  }
}

export function euclideanRotation(theta: number, target: Coordinate) {
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);

  return {
    y: target.x * sin + target.y * cos,
    x: target.x * cos - target.y * sin
  };
}

