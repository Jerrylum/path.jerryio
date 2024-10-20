import { boundHeading } from "./Calculation";
import { EuclideanTransformation, Coordinate, CoordinateWithHeading } from "./Coordinate";

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

test("EuclideanTransformation class", () => {
  let converter = new EuclideanTransformation({ x: 0, y: 0, heading: 0 });
  let ans: Coordinate = { x: 0, y: 0 };
  let ans2: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  expect(converter.transform({ x: 3, y: 4 })).closeTo({ x: 3, y: 4 });
  expect(converter.transform({ x: 3, y: 4, heading: 32.1 })).closeTo({ x: 3, y: 4, heading: 32.1 });

  expect(converter.inverseTransform({ x: 3, y: 4 })).closeTo({ x: 3, y: 4 });
  expect(converter.inverseTransform({ x: 3, y: 4 })).closeTo({ x: 3, y: 4 });

  converter = new EuclideanTransformation({ x: 0, y: 0, heading: 45 });

  expect(converter.transform({ x: 3, y: 3 })).closeTo({ x: 0, y: Math.sqrt(3 ** 2 + 3 ** 2) });
  expect(converter.transform({ x: 3, y: 3, heading: 32.1 })).closeTo({
    x: 0,
    y: Math.sqrt(3 ** 2 + 3 ** 2),
    heading: boundHeading(32.1 - 45)
  });
  expect(converter.transform({ x: 3, y: 3, heading: 330 })).closeTo({
    x: 0,
    y: Math.sqrt(3 ** 2 + 3 ** 2),
    heading: 285
  });

  expect(converter.inverseTransform({ x: 0, y: Math.sqrt(3 ** 2 + 3 ** 2) })).closeTo({ x: 3, y: 3 });
  expect(converter.inverseTransform({ x: 0, y: Math.sqrt(3 ** 2 + 3 ** 2), heading: boundHeading(32.1 - 45) })).closeTo(
    {
      x: 3,
      y: 3
    }
  );
  expect(converter.inverseTransform({ x: 0, y: Math.sqrt(3 ** 2 + 3 ** 2), heading: 285 })).closeTo({ x: 3, y: 3 });

  converter = new EuclideanTransformation({ x: 0, y: 0, heading: -45 });

  expect(converter.transform({ x: 3, y: 3 })).closeTo({ x: Math.sqrt(3 ** 2 + 3 ** 2), y: 0 });
  expect(converter.transform({ x: 3, y: 3, heading: 32.1 })).closeTo({
    x: Math.sqrt(3 ** 2 + 3 ** 2),
    y: 0,
    heading: 45 + 32.1
  });
  expect(converter.transform({ x: 3, y: 3, heading: 330 })).closeTo({
    x: Math.sqrt(3 ** 2 + 3 ** 2),
    y: 0,
    heading: 15
  });

  expect(converter.inverseTransform({ x: Math.sqrt(3 ** 2 + 3 ** 2), y: 0 })).closeTo({ x: 3, y: 3 });
  expect(converter.inverseTransform({ x: Math.sqrt(3 ** 2 + 3 ** 2), y: 0, heading: 45 + 32.1 })).closeTo({
    x: 3,
    y: 3,
    heading: 32.1
  });
  expect(converter.inverseTransform({ x: Math.sqrt(3 ** 2 + 3 ** 2), y: 0, heading: 15 })).closeTo({
    x: 3,
    y: 3,
    heading: 330
  });

  converter = new EuclideanTransformation({ x: 10, y: 20, heading: -45 });

  expect(converter.transform({ x: 13, y: 23 })).closeTo({ x: Math.sqrt(3 ** 2 + 3 ** 2), y: 0 });
  expect(converter.transform({ x: 13, y: 23, heading: 32.1 })).closeTo({
    x: Math.sqrt(3 ** 2 + 3 ** 2),
    y: 0,
    heading: 45 + 32.1
  });
  expect(converter.transform({ x: 13, y: 23, heading: 330 })).closeTo({
    x: Math.sqrt(3 ** 2 + 3 ** 2),
    y: 0,
    heading: 15
  });

  expect(converter.inverseTransform({ x: Math.sqrt(3 ** 2 + 3 ** 2), y: 0 })).closeTo({ x: 13, y: 23 });
  expect(converter.inverseTransform({ x: Math.sqrt(3 ** 2 + 3 ** 2), y: 0, heading: 45 + 32.1 })).closeTo({
    x: 13,
    y: 23,
    heading: 32.1
  });
  expect(converter.inverseTransform({ x: Math.sqrt(3 ** 2 + 3 ** 2), y: 0, heading: 15 })).closeTo({
    x: 13,
    y: 23,
    heading: 330
  });
});

test("EuclideanTransformation inverse", () => {
  let converter = new EuclideanTransformation({ x: 400, y: 300, heading: 0 });

  expect(converter.transform({ x: 400, y: 300 })).closeTo({ x: 0, y: 0 });
  expect(converter.transform({ x: 401, y: 300 })).closeTo({ x: 1, y: 0 });
  expect(converter.transform({ x: 399, y: 300 })).closeTo({ x: -1, y: 0 });
  expect(converter.transform({ x: 399, y: 302 })).closeTo({ x: -1, y: 2 });
  expect(converter.transform({ x: 399, y: 298 })).closeTo({ x: -1, y: -2 });
  expect(converter.transform({ x: 0, y: 0 })).closeTo({ x: -400, y: -300 });

  expect(converter.inverseTransform({ x: 0, y: 0 })).closeTo({ x: 400, y: 300 });
  expect(converter.inverseTransform({ x: 1, y: 0 })).closeTo({ x: 401, y: 300 });
  expect(converter.inverseTransform({ x: -1, y: 0 })).closeTo({ x: 399, y: 300 });
  expect(converter.inverseTransform({ x: -1, y: 2 })).closeTo({ x: 399, y: 302 });
  expect(converter.inverseTransform({ x: -1, y: -2 })).closeTo({ x: 399, y: 298 });
  expect(converter.inverseTransform({ x: -400, y: -300 })).closeTo({ x: 0, y: 0 });
});
