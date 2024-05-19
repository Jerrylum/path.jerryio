import { satisfies } from "semver";
import { Coordinate, CoordinateWithHeading, EuclideanTransformation, isCoordinateWithHeading } from "./Coordinate";
import { Vector } from "./Path";
import { boundHeading } from "./Calculation";

export interface Dimension {
  width: number;
  height: number;
}

/*

- Axis Rotation: `X-East Y-North` | `X-South Y-East`| `X-West Y-South`| `X-North Y-West`
- Y Axis Flip: `True` | `False`
- Heading Starting Axis: `Path Beginning` | `East` | `South` | `West` | `North`
- Heading Direction: `CW` | `CCW`
- Origin Position: `Path Beginning` | `Field Top Left` | `Field Top Center` | `Field Top Right` | `Field Left` | `Field Center` | `Field Right` | `Field Bottom Left` | `Field Bottom Center` | `Field Bottom Right`
- Origin X Offset: number (mm)
- Origin Y Offset: number (mm)
*/

export enum AxisRotation {
  XEastYNorth = 0,
  XSouthYEast = 90,
  XWestYSouth = 180,
  XNorthYWest = 270
}

export enum YAxisFlip {
  Flip = -1,
  NoFlip = 1
}

export type HeadingStartingAxis = "PathBeginning" | 90 | 180 | 270 | 0;

export enum HeadingDirection {
  Clockwise = 1,
  CounterClockwise = -1
}

export class OriginAnchor {
  static readonly PathBeginning = "PathBeginning";
  static readonly FieldTopLeft: Coordinate = { x: -1, y: 1 };
  static readonly FieldTopCenter: Coordinate = { x: 0, y: 1 };
  static readonly FieldTopRight: Coordinate = { x: 1, y: 1 };
  static readonly FieldLeft: Coordinate = { x: -1, y: 0 };
  static readonly FieldCenter: Coordinate = { x: 0, y: 0 };
  static readonly FieldRight: Coordinate = { x: 1, y: 0 };
  static readonly FieldBottomLeft: Coordinate = { x: -1, y: -1 };
  static readonly FieldBottomCenter: Coordinate = { x: 0, y: -1 };
  static readonly FieldBottomRight: Coordinate = { x: 1, y: -1 };
}

export type OriginAnchorType =
  | typeof OriginAnchor.PathBeginning
  | typeof OriginAnchor.FieldTopLeft
  | typeof OriginAnchor.FieldTopCenter
  | typeof OriginAnchor.FieldTopRight
  | typeof OriginAnchor.FieldLeft
  | typeof OriginAnchor.FieldCenter
  | typeof OriginAnchor.FieldRight
  | typeof OriginAnchor.FieldBottomLeft
  | typeof OriginAnchor.FieldBottomCenter
  | typeof OriginAnchor.FieldBottomRight;

export interface CoordinateSystem {
  axisRotation: AxisRotation;
  yAxisFlip: YAxisFlip;
  headingStartingAxis: HeadingStartingAxis;
  headingDirection: HeadingDirection;
  originAnchor: OriginAnchorType;
  originOffset: Coordinate; // mm
}

function getOrigin(
  system: CoordinateSystem,
  fieldCenter: Vector,
  fieldHalf: Vector,
  pathBeginning: CoordinateWithHeading
): CoordinateWithHeading {
  const originPreOffset =
    system.originAnchor !== "PathBeginning"
      ? fieldHalf.multiply(new Vector(system.originAnchor.x, system.originAnchor.y))
      : new Vector(pathBeginning.x, pathBeginning.y);

  return { x: originPreOffset.x, y: originPreOffset.y, heading: system.axisRotation };
}

export class CoordinateSystemTransformation {
  private et: EuclideanTransformation;
  private headingStartingAxis: number;

  constructor(
    readonly system: CoordinateSystem,
    readonly fieldDimension: Dimension,
    readonly pathBeginning: CoordinateWithHeading
  ) {
    const fieldCenter = new Vector(fieldDimension.width / 2, fieldDimension.height / 2);
    const fieldHalf = new Vector(fieldDimension.width / 2, fieldDimension.height / 2);
    const originPreOffsetAndAxisRotation = getOrigin(system, fieldCenter, fieldHalf, pathBeginning); // Coordinate in local system
    const tempEt = new EuclideanTransformation(originPreOffsetAndAxisRotation);
    const originWithOffset = tempEt.inverseTransform(system.originOffset); // Coordinate in local system
    const originWithOffsetAndAxisRotation = { ...originWithOffset, heading: originPreOffsetAndAxisRotation.heading }; // Coordinate in local system

    this.et = new EuclideanTransformation(originWithOffsetAndAxisRotation);

    this.headingStartingAxis =
      system.headingStartingAxis === "PathBeginning" ? this.pathBeginning.heading : system.headingStartingAxis;
  }

  transform(target: Coordinate): Coordinate;
  transform(target: CoordinateWithHeading): CoordinateWithHeading;
  transform(target: Coordinate | CoordinateWithHeading): Coordinate | CoordinateWithHeading {
    const transformed = this.et.transform(target);

    transformed.y *= this.system.yAxisFlip;

    if (isCoordinateWithHeading(target)) {
      const temp = boundHeading(target.heading - this.headingStartingAxis);
      const heading = boundHeading(temp * this.system.headingDirection);

      return { ...transformed, heading };
    } else {
      return transformed;
    }
  }
}
