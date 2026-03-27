import { CoordinateWithHeading } from "./Coordinate";
import {
  AxisAnchor,
  AxisRotation,
  CoordinateSystem,
  CoordinateSystemTransformation,
  CoordinateSystemUnrelatedToField,
  CoordinateSystemUnrelatedToFieldAndPath,
  CoordinateSystemUnrelatedToPath,
  Dimension,
  HeadingAnchor,
  HeadingDirection,
  HeadingRotation,
  OriginAnchor,
  YAxisFlip
} from "./CoordinateSystem";

declare global {
  namespace jest {
    // ...any other extensions, like "Matchers".
    interface Expect {
      closeTo(received: { [key: string]: number }, expected: { [key: string]: number }): any;
    }

    interface Matchers<R> {
      closeTo(expected: { [key: string]: number }): R;
    }
  }
}

beforeAll(() => {
  expect.extend({
    // obj close to
    closeTo: (received: { [key: string]: number }, expected: { [key: string]: number }) => {
      for (const key in expected) {
        expect(received[key]).toBeCloseTo(expected[key], 0.0001);
      }
      return { pass: true, message: () => "" };
    }
  });
});

test("CoordinateSystemTransformation original", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XEastYNorth,
    yAxisFlip: YAxisFlip.NoFlip,
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.North,
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  expect(cst.transform({ x: 1, y: 0 })).toEqual({ x: 1, y: 0 });
  expect(cst.transform({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
  expect(cst.transform({ x: 0, y: 2 })).toEqual({ x: 0, y: 2 });

  expect(cst.transform({ x: 0, y: 0, heading: 0 })).toEqual({ x: 0, y: 0, heading: 0 });
  expect(cst.transform({ x: 0, y: 0, heading: 45 })).toEqual({ x: 0, y: 0, heading: 45 });
  expect(cst.transform({ x: 0, y: 0, heading: 90 })).toEqual({ x: 0, y: 0, heading: 90 });
  expect(cst.transform({ x: 0, y: 0, heading: -45 })).toEqual({ x: 0, y: 0, heading: 360 - 45 });
  expect(cst.transform({ x: 0, y: 0, heading: 270 })).toEqual({ x: 0, y: 0, heading: 270 });

  expect(cst.inverseTransform({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  expect(cst.inverseTransform({ x: 1, y: 0 })).toEqual({ x: 1, y: 0 });
  expect(cst.inverseTransform({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
  expect(cst.inverseTransform({ x: 0, y: 2 })).toEqual({ x: 0, y: 2 });

  expect(cst.inverseTransform({ x: 0, y: 0, heading: 0 })).toEqual({ x: 0, y: 0, heading: 0 });
  expect(cst.inverseTransform({ x: 0, y: 0, heading: 45 })).toEqual({ x: 0, y: 0, heading: 45 });
  expect(cst.inverseTransform({ x: 0, y: 0, heading: 90 })).toEqual({ x: 0, y: 0, heading: 90 });
  expect(cst.inverseTransform({ x: 0, y: 0, heading: -45 })).toEqual({ x: 0, y: 0, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: 0, y: 0, heading: 270 })).toEqual({ x: 0, y: 0, heading: 270 });
});

test("CoordinateSystemTransformation 90", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XSouthYEast, // Changed
    yAxisFlip: YAxisFlip.NoFlip,
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.East, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -2, y: 1, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -2, y: 1, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -2, y: 1, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -2, y: 1, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -2, y: 1, heading: 180 });

  expect(cst.inverseTransform({ x: -2, y: 1, heading: 270 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 315 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 0 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 225 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 180 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 180", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XWestYSouth, // Changed
    yAxisFlip: YAxisFlip.NoFlip,
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.South, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -1, y: -2, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -1, y: -2, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -1, y: -2, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -1, y: -2, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -1, y: -2, heading: 90 });

  expect(cst.inverseTransform({ x: -1, y: -2, heading: 180 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: -1, y: -2, heading: 225 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: -1, y: -2, heading: 270 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: -1, y: -2, heading: 135 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: -1, y: -2, heading: 90 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 270", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XNorthYWest, // Changed
    yAxisFlip: YAxisFlip.NoFlip,
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.West, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: 2, y: -1, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: 2, y: -1, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: 2, y: -1, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: 2, y: -1, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: 2, y: -1, heading: 0 });

  expect(cst.inverseTransform({ x: 2, y: -1, heading: 90 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: 2, y: -1, heading: 135 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: 2, y: -1, heading: 180 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: 2, y: -1, heading: 45 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: 2, y: -1, heading: 0 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 90 & 0", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XSouthYEast, // Changed
    yAxisFlip: YAxisFlip.NoFlip,
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.North, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -2, y: 1, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -2, y: 1, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -2, y: 1, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -2, y: 1, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -2, y: 1, heading: 270 });

  expect(cst.inverseTransform({ x: -2, y: 1, heading: 0 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 45 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 90 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 315 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 270 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 90 & 180", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XSouthYEast, // Changed
    yAxisFlip: YAxisFlip.NoFlip,
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.South, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -2, y: 1, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -2, y: 1, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -2, y: 1, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -2, y: 1, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -2, y: 1, heading: 90 });

  expect(cst.inverseTransform({ x: -2, y: 1, heading: 180 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 225 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 270 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 135 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 90 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 90 & 270", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XSouthYEast, // Changed
    yAxisFlip: YAxisFlip.NoFlip,
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.West, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -2, y: 1, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -2, y: 1, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -2, y: 1, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -2, y: 1, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -2, y: 1, heading: 0 });

  expect(cst.inverseTransform({ x: -2, y: 1, heading: 90 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 135 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 180 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 45 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: -2, y: 1, heading: 0 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 180 & flip & 0", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XWestYSouth, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.North, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -1, y: 2, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -1, y: 2, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -1, y: 2, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -1, y: 2, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -1, y: 2, heading: 270 });

  expect(cst.inverseTransform({ x: -1, y: 2, heading: 0 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: -1, y: 2, heading: 45 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: -1, y: 2, heading: 90 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: -1, y: 2, heading: 315 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: -1, y: 2, heading: 270 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 180 & flip & 90", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XWestYSouth, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.East, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -1, y: 2, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -1, y: 2, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -1, y: 2, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -1, y: 2, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -1, y: 2, heading: 180 });

  expect(cst.inverseTransform({ x: -1, y: 2, heading: 270 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: -1, y: 2, heading: 315 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: -1, y: 2, heading: 0 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: -1, y: 2, heading: 225 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: -1, y: 2, heading: 180 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 180 & flip & 270", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XWestYSouth, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.West, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -1, y: 2, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -1, y: 2, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -1, y: 2, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -1, y: 2, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -1, y: 2, heading: 0 });

  expect(cst.inverseTransform({ x: -1, y: 2, heading: 90 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: -1, y: 2, heading: 135 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: -1, y: 2, heading: 180 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: -1, y: 2, heading: 45 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: -1, y: 2, heading: 0 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 270 & flip & 0 & ccw", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XNorthYWest, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.North, // Changed
    headingDirection: HeadingDirection.CounterClockwise, // Changed
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: 2, y: 1, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: 2, y: 1, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: 2, y: 1, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: 2, y: 1, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: 2, y: 1, heading: 90 });

  expect(cst.inverseTransform({ x: 2, y: 1, heading: 0 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: 2, y: 1, heading: 315 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: 2, y: 1, heading: 270 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: 2, y: 1, heading: 45 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: 2, y: 1, heading: 90 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 270 & flip & 90 & ccw", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XNorthYWest, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.East, // Changed
    headingDirection: HeadingDirection.CounterClockwise, // Changed
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: 2, y: 1, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: 2, y: 1, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: 2, y: 1, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: 2, y: 1, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: 2, y: 1, heading: 180 });

  expect(cst.inverseTransform({ x: 2, y: 1, heading: 90 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: 2, y: 1, heading: 45 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: 2, y: 1, heading: 0 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: 2, y: 1, heading: 135 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: 2, y: 1, heading: 180 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 270 & flip & 180 & ccw", () => {
  let system: CoordinateSystemUnrelatedToFieldAndPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XNorthYWest, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.South, // Changed
    headingDirection: HeadingDirection.CounterClockwise, // Changed
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let cst = CoordinateSystemTransformation.buildWithoutFieldAndBeginningInfo(system);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: 2, y: 1, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: 2, y: 1, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: 2, y: 1, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: 2, y: 1, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: 2, y: 1, heading: 270 });

  expect(cst.inverseTransform({ x: 2, y: 1, heading: 180 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: 2, y: 1, heading: 135 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: 2, y: 1, heading: 90 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: 2, y: 1, heading: 225 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: 2, y: 1, heading: 270 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 0 & no-flip & 0 & cw & TopRight", () => {
  let system: CoordinateSystemUnrelatedToPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XEastYNorth, // Changed
    yAxisFlip: YAxisFlip.NoFlip, // Changed
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.North, // Changed
    headingDirection: HeadingDirection.Clockwise, // Changed
    originAnchor: OriginAnchor.FieldTopRight, // Changed
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };

  let cst = CoordinateSystemTransformation.buildWithoutBeginningInfo(system, fd);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: 1 - 200, y: 2 - 150, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: 1 - 200, y: 2 - 150, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: 1 - 200, y: 2 - 150, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: 1 - 200, y: 2 - 150, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: 1 - 200, y: 2 - 150, heading: 270 });

  expect(cst.inverseTransform({ x: 1 - 200, y: 2 - 150, heading: 0 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: 1 - 200, y: 2 - 150, heading: 45 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: 1 - 200, y: 2 - 150, heading: 90 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: 1 - 200, y: 2 - 150, heading: 315 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: 1 - 200, y: 2 - 150, heading: 270 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 0 & flip & 90 & cw & BottomRight", () => {
  let system: CoordinateSystemUnrelatedToPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XEastYNorth, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.East, // Changed
    headingDirection: HeadingDirection.Clockwise, // Changed
    originAnchor: OriginAnchor.FieldBottomRight, // Changed
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };

  let cst = CoordinateSystemTransformation.buildWithoutBeginningInfo(system, fd);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: 1 - 200, y: -2 - 150, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: 1 - 200, y: -2 - 150, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: 1 - 200, y: -2 - 150, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: 1 - 200, y: -2 - 150, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: 1 - 200, y: -2 - 150, heading: 180 });

  expect(cst.inverseTransform({ x: 1 - 200, y: -2 - 150, heading: 270 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: 1 - 200, y: -2 - 150, heading: 315 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: 1 - 200, y: -2 - 150, heading: 0 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: 1 - 200, y: -2 - 150, heading: 225 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: 1 - 200, y: -2 - 150, heading: 180 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 0 & flip & 180 & cw & BottomLeft", () => {
  let system: CoordinateSystemUnrelatedToPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XEastYNorth, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.South, // Changed
    headingDirection: HeadingDirection.Clockwise, // Changed
    originAnchor: OriginAnchor.FieldBottomLeft, // Changed
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };

  let cst = CoordinateSystemTransformation.buildWithoutBeginningInfo(system, fd);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: 1 + 200, y: -2 - 150, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: 1 + 200, y: -2 - 150, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: 1 + 200, y: -2 - 150, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: 1 + 200, y: -2 - 150, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: 1 + 200, y: -2 - 150, heading: 90 });

  expect(cst.inverseTransform({ x: 1 + 200, y: -2 - 150, heading: 180 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: 1 + 200, y: -2 - 150, heading: 225 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: 1 + 200, y: -2 - 150, heading: 270 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: 1 + 200, y: -2 - 150, heading: 135 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: 1 + 200, y: -2 - 150, heading: 90 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 90 & no-flip & 270 & ccw & TopLeft", () => {
  let system: CoordinateSystemUnrelatedToPath = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XSouthYEast, // Changed
    yAxisFlip: YAxisFlip.NoFlip, // Changed
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.West, // Changed
    headingDirection: HeadingDirection.CounterClockwise, // Changed
    originAnchor: OriginAnchor.FieldTopLeft, // Changed
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };

  let cst = CoordinateSystemTransformation.buildWithoutBeginningInfo(system, fd);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -2 + 150, y: 1 + 200, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -2 + 150, y: 1 + 200, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -2 + 150, y: 1 + 200, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -2 + 150, y: 1 + 200, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -2 + 150, y: 1 + 200, heading: 0 });

  expect(cst.inverseTransform({ x: -2 + 150, y: 1 + 200, heading: 270 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: -2 + 150, y: 1 + 200, heading: 225 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: -2 + 150, y: 1 + 200, heading: 180 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: -2 + 150, y: 1 + 200, heading: 315 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: -2 + 150, y: 1 + 200, heading: 0 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 0 & no-flip & 0 & ccw & path-beginning & offset", () => {
  let system: CoordinateSystemUnrelatedToField = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XEastYNorth,
    yAxisFlip: YAxisFlip.NoFlip,
    headingAnchor: HeadingAnchor.Default,
    headingRotation: HeadingRotation.North,
    headingDirection: HeadingDirection.CounterClockwise, // Changed
    originAnchor: OriginAnchor.PathBeginning, // Changed
    originOffset: { x: 10, y: 20 } // Changed
  };
  let beginning = { x: 400, y: 300, heading: 45 };

  let cst = CoordinateSystemTransformation.buildWithoutFieldInfo(system, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -409, y: -318, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -409, y: -318, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -409, y: -318, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -409, y: -318, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -409, y: -318, heading: 90 });

  expect(cst.inverseTransform({ x: -409, y: -318, heading: 0 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: -409, y: -318, heading: 315 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: -409, y: -318, heading: 270 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: -409, y: -318, heading: 45 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: -409, y: -318, heading: 90 })).closeTo({ x: 1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 0 & no-flip & path-beginning & ccw & path-beginning & offset", () => {
  let system: CoordinateSystemUnrelatedToField = {
    axisAnchor: AxisAnchor.Default,
    axisRotation: AxisRotation.XEastYNorth,
    yAxisFlip: YAxisFlip.NoFlip,
    headingAnchor: HeadingAnchor.PathBeginning,
    headingRotation: HeadingRotation.North, // Changed
    headingDirection: HeadingDirection.CounterClockwise, // Changed
    originAnchor: OriginAnchor.PathBeginning, // Changed
    originOffset: { x: 10, y: 20 } // Changed
  };
  let beginning = { x: 400, y: 300, heading: 45 };

  let cst = CoordinateSystemTransformation.buildWithoutFieldInfo(system, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -409, y: -318, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -409, y: -318, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -409, y: -318, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -409, y: -318, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -409, y: -318, heading: 135 });

  expect(cst.inverseTransform({ x: -409, y: -318, heading: 45 })).closeTo({ x: 1, y: 2, heading: 0 });
  expect(cst.inverseTransform({ x: -409, y: -318, heading: 0 })).closeTo({ x: 1, y: 2, heading: 45 });
  expect(cst.inverseTransform({ x: -409, y: -318, heading: 315 })).closeTo({ x: 1, y: 2, heading: 90 });
  expect(cst.inverseTransform({ x: -409, y: -318, heading: 90 })).closeTo({ x: 1, y: 2, heading: 360 - 45 });
  expect(cst.inverseTransform({ x: -409, y: -318, heading: 135 })).closeTo({ x: 1, y: 2, heading: 270 });
});
