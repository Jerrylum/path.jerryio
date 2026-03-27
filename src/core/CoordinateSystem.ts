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

export enum AxisAnchor {
  PathBeginning = "PathBeginning",
  Default = "Default"
}

export enum HeadingAnchor {
  PathBeginning = "PathBeginning",
  Default = "Default"
}

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
  North = 0,
  East = 90,
  South = 180,
  West = 270
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
  axisAnchor: AxisAnchor;
  axisRotation: AxisRotation;
  yAxisFlip: YAxisFlip;
  headingAnchor: HeadingAnchor;
  headingRotation: HeadingRotation;
  headingDirection: HeadingDirection;
  originAnchor: OriginAnchorType;
  originOffset: Coordinate; // mm
}

export interface CoordinateSystemUnrelatedToField extends CoordinateSystem {
  originAnchor: typeof OriginAnchor.FieldCenter | typeof OriginAnchor.PathBeginning;
}

export interface CoordinateSystemUnrelatedToPath extends CoordinateSystem {
  axisAnchor: AxisAnchor.Default;
  headingAnchor: HeadingAnchor.Default;
  originAnchor: Exclude<OriginAnchorType, typeof OriginAnchor.PathBeginning>;
}

export interface CoordinateSystemUnrelatedToFieldAndPath extends CoordinateSystem {
  axisAnchor: AxisAnchor.Default;
  headingAnchor: HeadingAnchor.Default;
  originAnchor: typeof OriginAnchor.FieldCenter;
}

export interface NamedCoordinateSystem extends CoordinateSystem {
  name: string;
  description: string;
  previewImageUrl: string;
}

export function getNamedCoordinateSystems(): NamedCoordinateSystem[] {
  return [
    {
      name: "VEX Gaming Positioning System",
      description: "The standard coordinate system defined by VEX Robotics.",
      previewImageUrl: "static/coordinate-system-preview-vex-gps.png",
      axisAnchor: AxisAnchor.Default,
      axisRotation: AxisRotation.XEastYNorth,
      yAxisFlip: YAxisFlip.NoFlip,
      headingAnchor: HeadingAnchor.Default,
      headingRotation: HeadingRotation.North,
      headingDirection: HeadingDirection.Clockwise,
      originAnchor: OriginAnchor.FieldCenter,
      originOffset: { x: 0, y: 0 }
    },
    {
      name: "Cartesian Plane",
      description:
        "A standard Cartesian coordinate system. Heading is measured in degrees counterclockwise from the positive x-axis.",
      previewImageUrl: "static/coordinate-system-preview-cartesian-plane.png",
      axisAnchor: AxisAnchor.Default,
      axisRotation: AxisRotation.XEastYNorth,
      yAxisFlip: YAxisFlip.NoFlip,
      headingAnchor: HeadingAnchor.Default,
      headingRotation: HeadingRotation.East,
      headingDirection: HeadingDirection.CounterClockwise,
      originAnchor: OriginAnchor.FieldCenter,
      originOffset: { x: 0, y: 0 }
    },
    {
      name: "Path-Based Coordinates",
      description:
        "This coordinate system is relative to the beginning of a path. The origin is set at the path's starting point, and the axes are aligned to the field's default orientation.",
      previewImageUrl: "static/coordinate-system-preview-path-relative.png",
      axisAnchor: AxisAnchor.Default,
      axisRotation: AxisRotation.XEastYNorth,
      yAxisFlip: YAxisFlip.NoFlip,
      headingAnchor: HeadingAnchor.Default,
      headingRotation: HeadingRotation.North,
      headingDirection: HeadingDirection.Clockwise,
      originAnchor: OriginAnchor.PathBeginning,
      originOffset: { x: 0, y: 0 }
    },
    {
      name: "Path-Based Strict Coordinates",
      description:
        "A strict version of the Path-Based Coordinates system. The origin and axes are both anchored to the beginning of the path.",
      previewImageUrl: "static/coordinate-system-preview-path-relative-strict-mode.png",
      axisAnchor: AxisAnchor.PathBeginning,
      axisRotation: AxisRotation.XEastYNorth,
      yAxisFlip: YAxisFlip.NoFlip,
      headingAnchor: HeadingAnchor.PathBeginning,
      headingRotation: HeadingRotation.North,
      headingDirection: HeadingDirection.Clockwise,
      originAnchor: OriginAnchor.PathBeginning,
      originOffset: { x: 0, y: 0 }
    }
  ];
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

  if (system.axisAnchor === "PathBeginning") {
    return { x: originPreOffset.x, y: originPreOffset.y, heading: pathBeginning.heading + system.axisRotation };
  } else {
    return { x: originPreOffset.x, y: originPreOffset.y, heading: system.axisRotation };
  }
}

function getHeadingRotation(system: CoordinateSystem, pathBeginning: CoordinateWithHeading) {
  if (system.headingAnchor === "PathBeginning") {
    return pathBeginning.heading + system.headingRotation;
  } else {
    return system.headingRotation;
  }
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

  transform(alpha: Coordinate): Coordinate;
  transform(alpha: CoordinateWithHeading): CoordinateWithHeading;
  transform(alpha: Coordinate | CoordinateWithHeading): Coordinate | CoordinateWithHeading {
    const transformed = this.et.transform(alpha);

    transformed.y *= this.system.yAxisFlip;

    if (isCoordinateWithHeading(alpha)) {
      const temp = boundHeading(alpha.heading - this.headingRotation);
      const heading = boundHeading(temp * this.system.headingDirection);

      return { ...transformed, heading };
    } else {
      return transformed;
    }
  }

  inverseTransform(beta: Coordinate): Coordinate;
  inverseTransform(beta: CoordinateWithHeading): CoordinateWithHeading;
  inverseTransform(beta: Coordinate | CoordinateWithHeading): Coordinate | CoordinateWithHeading {
    const temp = { ...beta };
    temp.y *= this.system.yAxisFlip;

    const transformed = this.et.inverseTransform(temp);

    if (isCoordinateWithHeading(beta)) {
      const temp = boundHeading(beta.heading * this.system.headingDirection);
      const heading = boundHeading(temp + this.headingRotation);

      return { ...transformed, heading };
    } else {
      return transformed;
    }
  }
}
