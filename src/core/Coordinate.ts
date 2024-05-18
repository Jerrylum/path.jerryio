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

  inverse(): EuclideanTransformation {
    // create a new instance of EuclideanTransformation such that we can transform the betaOrigin to the alphaOrigin
    return new EuclideanTransformation({
      x: this.betaOrigin.x * this.sin - this.betaOrigin.y * this.cos,
      y: this.betaOrigin.x * this.cos + this.betaOrigin.y * this.sin,
      heading: -this.betaOrigin.heading
    });
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
