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

  constructor(readonly betaOrigin: CoordinateWithHeading) {
    this.theta = fromHeadingInDegreeToAngleInRadian(boundHeading(-betaOrigin.heading + 90));
    this.sin = Math.sin(this.theta);
    this.cos = Math.cos(this.theta);
  }

  transform(alpha: Coordinate): Coordinate;
  transform(alpha: CoordinateWithHeading): CoordinateWithHeading;

  transform(alpha: Coordinate | CoordinateWithHeading): Coordinate | CoordinateWithHeading {
    const rtn: any = {
      y: (alpha.x - this.betaOrigin.x) * this.sin + (alpha.y - this.betaOrigin.y) * this.cos,
      x: (alpha.x - this.betaOrigin.x) * this.cos - (alpha.y - this.betaOrigin.y) * this.sin
    };

    if (isCoordinateWithHeading(alpha)) {
      rtn.heading = boundHeading(alpha.heading - this.betaOrigin.heading);
    }

    return rtn;
  }

  inverseTransform(beta: Coordinate): Coordinate;
  inverseTransform(beta: CoordinateWithHeading): CoordinateWithHeading;

  inverseTransform(beta: Coordinate | CoordinateWithHeading): Coordinate | CoordinateWithHeading {
    const rtn: any = {
      y: -beta.x * this.sin + beta.y * this.cos + this.betaOrigin.y,
      x: beta.x * this.cos + beta.y * this.sin + this.betaOrigin.x
    };

    if (isCoordinateWithHeading(beta)) {
      rtn.heading = boundHeading(beta.heading + this.betaOrigin.heading);
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
