import { boundHeading } from "./Calculation";
import { EuclideanTransformation, Coordinate, CoordinateWithHeading } from "./Coordinate";

test("EuclideanTransformation class", () => {
  let converter = new EuclideanTransformation({ x: 0, y: 0, heading: 0 });
  let ans: Coordinate = { x: 0, y: 0 };
  let ans2: CoordinateWithHeading = { x: 0, y: 0, heading: 0 };

  ans = converter.transform({ x: 3, y: 4 });
  expect(ans.x).toBeCloseTo(3);
  expect(ans.y).toBeCloseTo(4);

  ans2 = converter.transform({ x: 3, y: 4, heading: 32.1 });
  expect(ans2.x).toBeCloseTo(3);
  expect(ans2.y).toBeCloseTo(4);
  expect(ans2.heading).toBeCloseTo(32.1);

  converter = new EuclideanTransformation({ x: 0, y: 0, heading: 45 });

  ans = converter.transform({ x: 3, y: 3 });
  expect(ans.x).toBeCloseTo(0);
  expect(ans.y).toBeCloseTo(Math.sqrt(3 ** 2 + 3 ** 2));

  ans2 = converter.transform({ x: 3, y: 3, heading: 32.1 });
  expect(ans2.x).toBeCloseTo(0);
  expect(ans2.y).toBeCloseTo(Math.sqrt(3 ** 2 + 3 ** 2));
  expect(ans2.heading).toBeCloseTo(boundHeading(32.1 - 45));

  ans2 = converter.transform({ x: 3, y: 3, heading: 330 });
  expect(ans2.x).toBeCloseTo(0);
  expect(ans2.y).toBeCloseTo(Math.sqrt(3 ** 2 + 3 ** 2));
  expect(ans2.heading).toBeCloseTo(285);

  converter = new EuclideanTransformation({ x: 0, y: 0, heading: -45 });

  ans = converter.transform({ x: 3, y: 3 });
  expect(ans.x).toBeCloseTo(Math.sqrt(3 ** 2 + 3 ** 2));
  expect(ans.y).toBeCloseTo(0);

  ans2 = converter.transform({ x: 3, y: 3, heading: 32.1 });
  expect(ans2.x).toBeCloseTo(Math.sqrt(3 ** 2 + 3 ** 2));
  expect(ans2.y).toBeCloseTo(0);
  expect(ans2.heading).toBeCloseTo(45 + 32.1);

  ans2 = converter.transform({ x: 3, y: 3, heading: 330 });
  expect(ans2.x).toBeCloseTo(Math.sqrt(3 ** 2 + 3 ** 2));
  expect(ans2.y).toBeCloseTo(0);
  expect(ans2.heading).toBeCloseTo(15);

  converter = new EuclideanTransformation({ x: 10, y: 20, heading: -45 });

  ans = converter.transform({ x: 13, y: 23 });
  expect(ans.x).toBeCloseTo(Math.sqrt(3 ** 2 + 3 ** 2));
  expect(ans.y).toBeCloseTo(0);

  ans2 = converter.transform({ x: 13, y: 23, heading: 32.1 });
  expect(ans2.x).toBeCloseTo(Math.sqrt(3 ** 2 + 3 ** 2));
  expect(ans2.y).toBeCloseTo(0);
  expect(ans2.heading).toBeCloseTo(45 + 32.1);

  ans2 = converter.transform({ x: 13, y: 23, heading: 330 });
  expect(ans2.x).toBeCloseTo(Math.sqrt(3 ** 2 + 3 ** 2));
  expect(ans2.y).toBeCloseTo(0);
  expect(ans2.heading).toBeCloseTo(15);
});
