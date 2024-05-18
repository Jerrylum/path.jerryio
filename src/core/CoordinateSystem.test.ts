import { CoordinateWithHeading } from "./Coordinate";
import {
  AxisRotation,
  CoordinateSystem,
  CoordinateSystemTransformation,
  Dimension,
  HeadingDirection,
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

test("CoordinateSystemTransformation original", () => {
  expect.extend({
    // obj close to
    closeTo: (received: { [key: string]: number }, expected: { [key: string]: number }) => {
      for (const key in expected) {
        expect(received[key]).toBeCloseTo(expected[key], 0.0001);
      }
      return { pass: true, message: () => "" };
    }
  });

  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XEastYNorth,
    yAxisFlip: YAxisFlip.NoFlip,
    headingStartingAxis: 0,
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  expect(cst.transform({ x: 1, y: 0 })).toEqual({ x: 1, y: 0 });
  expect(cst.transform({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
  expect(cst.transform({ x: 0, y: 2 })).toEqual({ x: 0, y: 2 });

  expect(cst.transform({ x: 0, y: 0, heading: 0 })).toEqual({ x: 0, y: 0, heading: 0 });
  expect(cst.transform({ x: 0, y: 0, heading: 45 })).toEqual({ x: 0, y: 0, heading: 45 });
  expect(cst.transform({ x: 0, y: 0, heading: 90 })).toEqual({ x: 0, y: 0, heading: 90 });
  expect(cst.transform({ x: 0, y: 0, heading: -45 })).toEqual({ x: 0, y: 0, heading: 360 - 45 });
  expect(cst.transform({ x: 0, y: 0, heading: 270 })).toEqual({ x: 0, y: 0, heading: 270 });
});

test("CoordinateSystemTransformation 90", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XSouthYEast, // Changed
    yAxisFlip: YAxisFlip.NoFlip,
    headingStartingAxis: 90, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -2, y: 1, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -2, y: 1, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -2, y: 1, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -2, y: 1, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -2, y: 1, heading: 180 });
});

test("CoordinateSystemTransformation 180", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XWestYSouth, // Changed
    yAxisFlip: YAxisFlip.NoFlip,
    headingStartingAxis: 180, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -1, y: -2, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -1, y: -2, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -1, y: -2, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -1, y: -2, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -1, y: -2, heading: 90 });
});

test("CoordinateSystemTransformation 270", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XNorthYWest, // Changed
    yAxisFlip: YAxisFlip.NoFlip,
    headingStartingAxis: 270, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: 2, y: -1, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: 2, y: -1, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: 2, y: -1, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: 2, y: -1, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: 2, y: -1, heading: 0 });
});

test("CoordinateSystemTransformation 90 - 0", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XSouthYEast, // Changed
    yAxisFlip: YAxisFlip.NoFlip,
    headingStartingAxis: 0, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -2, y: 1, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -2, y: 1, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -2, y: 1, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -2, y: 1, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -2, y: 1, heading: 270 });
});

test("CoordinateSystemTransformation 90 - 180", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XSouthYEast, // Changed
    yAxisFlip: YAxisFlip.NoFlip,
    headingStartingAxis: 180, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -2, y: 1, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -2, y: 1, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -2, y: 1, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -2, y: 1, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -2, y: 1, heading: 90 });
});

test("CoordinateSystemTransformation 90 - 270", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XSouthYEast, // Changed
    yAxisFlip: YAxisFlip.NoFlip,
    headingStartingAxis: 270, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -2, y: 1, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -2, y: 1, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -2, y: 1, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -2, y: 1, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -2, y: 1, heading: 0 });
});

test("CoordinateSystemTransformation 180 - flip - 0", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XWestYSouth, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingStartingAxis: 0, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -1, y: 2, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -1, y: 2, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -1, y: 2, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -1, y: 2, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -1, y: 2, heading: 270 });
});

test("CoordinateSystemTransformation 180 - flip - 90", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XWestYSouth, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingStartingAxis: 90, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -1, y: 2, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -1, y: 2, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -1, y: 2, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -1, y: 2, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -1, y: 2, heading: 180 });
});

test("CoordinateSystemTransformation 180 - flip - 270", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XWestYSouth, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingStartingAxis: 270, // Changed
    headingDirection: HeadingDirection.Clockwise,
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: -1, y: 2, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: -1, y: 2, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: -1, y: 2, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: -1, y: 2, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: -1, y: 2, heading: 0 });
});

test("CoordinateSystemTransformation 270 - flip - 0 - ccw", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XNorthYWest, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingStartingAxis: 0, // Changed
    headingDirection: HeadingDirection.CounterClockwise, // Changed
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: 2, y: 1, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: 2, y: 1, heading: 315 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: 2, y: 1, heading: 270 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: 2, y: 1, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: 2, y: 1, heading: 90 });
});

test("CoordinateSystemTransformation 270 - flip - 90 - ccw", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XNorthYWest, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingStartingAxis: 90, // Changed
    headingDirection: HeadingDirection.CounterClockwise, // Changed
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: 2, y: 1, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: 2, y: 1, heading: 45 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: 2, y: 1, heading: 0 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: 2, y: 1, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: 2, y: 1, heading: 180 });
});

test("CoordinateSystemTransformation 270 - flip - 180 - ccw", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XNorthYWest, // Changed
    yAxisFlip: YAxisFlip.Flip, // Changed
    headingStartingAxis: 180, // Changed
    headingDirection: HeadingDirection.CounterClockwise, // Changed
    originAnchor: OriginAnchor.FieldCenter,
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: 2, y: 1, heading: 180 });
  expect(cst.transform({ x: 1, y: 2, heading: 45 })).closeTo({ x: 2, y: 1, heading: 135 });
  expect(cst.transform({ x: 1, y: 2, heading: 90 })).closeTo({ x: 2, y: 1, heading: 90 });
  expect(cst.transform({ x: 1, y: 2, heading: -45 })).closeTo({ x: 2, y: 1, heading: 225 });
  expect(cst.transform({ x: 1, y: 2, heading: 270 })).closeTo({ x: 2, y: 1, heading: 270 });
});

test("CoordinateSystemTransformation 0 - no-flip - 0 - cw - TopRight", () => {
  let system: CoordinateSystem = {
    axisRotation: AxisRotation.XEastYNorth, // Changed
    yAxisFlip: YAxisFlip.NoFlip, // Changed
    headingStartingAxis: 0, // Changed
    headingDirection: HeadingDirection.Clockwise, // Changed
    originAnchor: OriginAnchor.FieldTopRight, // Changed
    originOffset: { x: 0, y: 0 }
  };
  let fd: Dimension = { width: 400, height: 300 };
  let beginning: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  let cst = new CoordinateSystemTransformation(system, fd, beginning);

  // expect(cst.transform({ x: 1, y: 2, heading: 0 })).closeTo({ x: 1 -150, y: -2, heading: 90 }); // TODO
});
