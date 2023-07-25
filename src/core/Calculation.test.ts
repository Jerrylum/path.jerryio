import {
  toDerivativeHeading,
  fromHeadingInDegreeToAngleInRadian,
  fromDegreeToRadian,
  findClosestPointOnLine,
  findLinesIntersection
} from "./Calculation";
import { Vector } from "./Path";

test("toDerivativeHeading", () => {
  expect(toDerivativeHeading(0, 270)).toBe(-90);
  expect(toDerivativeHeading(270, 0)).toBe(90);
  expect(toDerivativeHeading(0, 90)).toBe(90);
  expect(toDerivativeHeading(90, 0)).toBe(-90);
  expect(toDerivativeHeading(0, 180)).toBe(-180);
  expect(toDerivativeHeading(180, 0)).toBe(-180);
});

test("fromHeadingInDegreeToAngleInRadian", () => {
  expect(fromHeadingInDegreeToAngleInRadian(0)).toBeCloseTo(fromDegreeToRadian(90));
  expect(fromHeadingInDegreeToAngleInRadian(90)).toBeCloseTo(fromDegreeToRadian(0));
  expect(fromHeadingInDegreeToAngleInRadian(180)).toBeCloseTo(fromDegreeToRadian(-90));
  expect(fromHeadingInDegreeToAngleInRadian(270)).toBeCloseTo(fromDegreeToRadian(180));
  expect(fromHeadingInDegreeToAngleInRadian(359)).toBeCloseTo(fromDegreeToRadian(91));
  expect(fromHeadingInDegreeToAngleInRadian(91)).toBeCloseTo(fromDegreeToRadian(-1));
});

test("findClosestPointOnLine", () => {
  let ans: Vector;

  ans = findClosestPointOnLine(new Vector(0, 0), 0, new Vector(2, 0));
  expect(ans.x).toBeCloseTo(0);
  expect(ans.y).toBeCloseTo(0);

  ans = findClosestPointOnLine(new Vector(0, 0), 45, new Vector(2, 0));
  expect(ans.x).toBeCloseTo(1);
  expect(ans.y).toBeCloseTo(1);

  ans = findClosestPointOnLine(new Vector(0, 0), 90, new Vector(2, 0));
  expect(ans.x).toBeCloseTo(2);
  expect(ans.y).toBeCloseTo(0);

  ans = findClosestPointOnLine(new Vector(0, 0), 135, new Vector(2, 0));
  expect(ans.x).toBeCloseTo(1);
  expect(ans.y).toBeCloseTo(-1);

  ans = findClosestPointOnLine(new Vector(0, 0), 180, new Vector(2, 0));
  expect(ans.x).toBeCloseTo(0);
  expect(ans.y).toBeCloseTo(0);

  ans = findClosestPointOnLine(new Vector(0, 0), 225, new Vector(2, 0));
  expect(ans.x).toBeCloseTo(1);
  expect(ans.y).toBeCloseTo(1);

  ans = findClosestPointOnLine(new Vector(0, 0), 270, new Vector(2, 0));
  expect(ans.x).toBeCloseTo(2);
  expect(ans.y).toBeCloseTo(0);

  ans = findClosestPointOnLine(new Vector(0, 0), 315, new Vector(2, 0));
  expect(ans.x).toBeCloseTo(1);
  expect(ans.y).toBeCloseTo(-1);

  ans = findClosestPointOnLine(new Vector(0, 0), 360, new Vector(2, 0)); // 360 is not acceptable btw
  expect(ans.x).toBeCloseTo(0);
  expect(ans.y).toBeCloseTo(0);

  ans = findClosestPointOnLine(new Vector(0, 0), 135, new Vector(3, 0));
  expect(ans.x).toBeCloseTo(1.5);
  expect(ans.y).toBeCloseTo(-1.5);

  ans = findClosestPointOnLine(new Vector(30, 30), 135, new Vector(3, 0));
  expect(ans.x).toBeCloseTo(31.5);
  expect(ans.y).toBeCloseTo(28.5);

  ans = findClosestPointOnLine(new Vector(0, 0), 0, new Vector(0, 0));
  expect(ans.x).toBeCloseTo(0);
  expect(ans.y).toBeCloseTo(0);

  ans = findClosestPointOnLine(new Vector(0, 0), 90, new Vector(0, 0));
  expect(ans.x).toBeCloseTo(0);
  expect(ans.y).toBeCloseTo(0);

  ans = findClosestPointOnLine(new Vector(0, 0), 180, new Vector(0, 0));
  expect(ans.x).toBeCloseTo(0);
  expect(ans.y).toBeCloseTo(0);

  ans = findClosestPointOnLine(new Vector(0, 0), 270, new Vector(0, 0));
  expect(ans.x).toBeCloseTo(0);
  expect(ans.y).toBeCloseTo(0);
});

test("findLinesIntersection", () => {
  let ans: Vector | undefined;

  ans = findLinesIntersection(new Vector(0, 0), 45, new Vector(2, 0), 315);
  expect(ans).toBeDefined();
  expect(ans!.x).toBeCloseTo(1);
  expect(ans!.y).toBeCloseTo(1);

  ans = findLinesIntersection(new Vector(0, 0), 135, new Vector(2, 0), 225);
  expect(ans).toBeDefined();
  expect(ans!.x).toBeCloseTo(1);
  expect(ans!.y).toBeCloseTo(-1);

  ans = findLinesIntersection(new Vector(0, 0), 0, new Vector(2, 0), 315);
  expect(ans).toBeDefined();
  expect(ans!.x).toBeCloseTo(0);
  expect(ans!.y).toBeCloseTo(2);

  ans = findLinesIntersection(new Vector(40, 30), 0, new Vector(42, 30), 315);
  expect(ans).toBeDefined();
  expect(ans!.x).toBeCloseTo(40);
  expect(ans!.y).toBeCloseTo(32);

  ans = findLinesIntersection(new Vector(0, 0), 0, new Vector(2, 0), 180);
  expect(ans).toBeUndefined();

  // write test cases
  ans = findLinesIntersection(new Vector(0, 0), 0, new Vector(2, 0), 0);
});
