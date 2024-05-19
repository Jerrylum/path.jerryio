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
- Heading Rotation: `Path Beginning` | `East` | `South` | `West` | `North`
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

export enum HeadingRotation {
  PathBeginning = "PathBeginning",
  East = 90,
  South = 180,
  West = 270,
  North = 0
}

export enum HeadingDirection {
  Clockwise = 1,
  CounterClockwise = -1
}

export class OriginAnchor {
  static PathBeginning = "PathBeginning" as const;
  static FieldTopLeft = { x: -1, y: 1 } as const;
  static FieldTopCenter = { x: 0, y: 1 } as const;
  static FieldTopRight = { x: 1, y: 1 } as const;
  static FieldLeft = { x: -1, y: 0 } as const;
  static FieldCenter = { x: 0, y: 0 } as const;
  static FieldRight = { x: 1, y: 0 } as const;
  static FieldBottomLeft = { x: -1, y: -1 } as const;
  static FieldBottomCenter = { x: 0, y: -1 } as const;
  static FieldBottomRight = { x: 1, y: -1 } as const;
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
  headingRotation: HeadingRotation;
  headingDirection: HeadingDirection;
  originAnchor: OriginAnchorType;
  originOffset: Coordinate; // mm
}

export interface CoordinateSystemUnrelatedToField extends CoordinateSystem {
  originAnchor: typeof OriginAnchor.FieldCenter | typeof OriginAnchor.PathBeginning;
}

export interface CoordinateSystemUnrelatedToPath extends CoordinateSystem {
  headingRotation: Exclude<HeadingRotation, typeof HeadingRotation.PathBeginning>;
  originAnchor: Exclude<OriginAnchorType, typeof OriginAnchor.PathBeginning>;
}

export interface CoordinateSystemUnrelatedToFieldAndPath extends CoordinateSystem {
  headingRotation: Exclude<HeadingRotation, typeof HeadingRotation.PathBeginning>;
  originAnchor: Exclude<OriginAnchorType, typeof OriginAnchor.PathBeginning>;
}

function getOrigin(
  system: CoordinateSystem,
  fieldHalf: Vector,
  pathBeginning: CoordinateWithHeading
): CoordinateWithHeading {
  const originPreOffset =
    system.originAnchor !== "PathBeginning"
      ? fieldHalf.multiply(new Vector(system.originAnchor.x, system.originAnchor.y))
      : new Vector(pathBeginning.x, pathBeginning.y);

  return { x: originPreOffset.x, y: originPreOffset.y, heading: system.axisRotation };
}

function getHeadingRotation(system: CoordinateSystem, pathBeginning: CoordinateWithHeading) {
  return system.headingRotation === "PathBeginning" ? pathBeginning.heading : system.headingRotation;
}

export class CoordinateSystemTransformation {
  private et: EuclideanTransformation;
  private headingRotation: number;

  constructor(
    readonly system: CoordinateSystem,
    readonly fieldDimension: Dimension,
    readonly pathBeginning: CoordinateWithHeading
  ) {
    const fieldHalf = new Vector(fieldDimension.width / 2, fieldDimension.height / 2);
    const originPreOffsetAndAxisRotation = getOrigin(system, fieldHalf, pathBeginning); // coordinate in local system
    const tempEt = new EuclideanTransformation(originPreOffsetAndAxisRotation);
    const originWithOffset = tempEt.inverseTransform(system.originOffset); // returns coordinate in local system
    const originWithOffsetAndAxisRotation = { ...originWithOffset, heading: originPreOffsetAndAxisRotation.heading }; // coordinate in local system

    this.et = new EuclideanTransformation(originWithOffsetAndAxisRotation);

    this.headingRotation = getHeadingRotation(system, pathBeginning);
  }

  static buildWithoutFieldInfo(
    system: CoordinateSystemUnrelatedToField,
    pathBeginning: CoordinateWithHeading
  ): CoordinateSystemTransformation {
    return new CoordinateSystemTransformation(system, { width: 0, height: 0 }, pathBeginning);
  }

  static buildWithoutBeginningInfo(
    system: CoordinateSystemUnrelatedToPath,
    fieldDimension: Dimension
  ): CoordinateSystemTransformation {
    return new CoordinateSystemTransformation(system, fieldDimension, { x: 0, y: 0, heading: 0 });
  }

  static buildWithoutFieldAndBeginningInfo(
    system: CoordinateSystemUnrelatedToFieldAndPath
  ): CoordinateSystemTransformation {
    return new CoordinateSystemTransformation(system, { width: 0, height: 0 }, { x: 0, y: 0, heading: 0 });
  }

  transform(target: Coordinate): Coordinate;
  transform(target: CoordinateWithHeading): CoordinateWithHeading;
  transform(target: Coordinate | CoordinateWithHeading): Coordinate | CoordinateWithHeading {
    const transformed = this.et.transform(target);

    transformed.y *= this.system.yAxisFlip;

    if (isCoordinateWithHeading(target)) {
      const temp = boundHeading(target.heading - this.headingRotation);
      const heading = boundHeading(temp * this.system.headingDirection);

      return { ...transformed, heading };
    } else {
      return transformed;
    }
  }
}
