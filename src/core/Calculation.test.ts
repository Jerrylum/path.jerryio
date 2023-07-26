import { CustomPathConfig } from "../format/Config.test";
import {
  toDerivativeHeading,
  fromHeadingInDegreeToAngleInRadian,
  fromDegreeToRadian,
  findClosestPointOnLine,
  findLinesIntersection,
  getBezierCurveArcLength,
  getBezierCurvePoints,
  getPathSamplePoints,
  getSegmentSamplePoints,
  getUniformPointsFromSamples,
  fromAngleInRadianToHeadingInDegree,
  boundHeading,
  boundAngle
} from "./Calculation";
import { Control, EndControl, Path, Segment, Vector } from "./Path";
import { Quantity, UnitOfLength } from "./Unit";


test("getPathSamplePoints", () => {
  const path = new Path(new CustomPathConfig(), new Segment(new EndControl(60, 60, 0), new EndControl(66, 60, 90)));
  
  const density = new Quantity(2, UnitOfLength.Centimeter);

  const samples = getPathSamplePoints(path, density);
  expect(samples.arcLength).toBeCloseTo(6);
  expect(samples.points.length).toEqual(101);
});


test("getPathSamplePoints with no segment path", () => {
  const path = new Path(new CustomPathConfig());
  
  const density = new Quantity(2, UnitOfLength.Centimeter);

  const samples = getPathSamplePoints(path, density);
  expect(samples.arcLength).toBeCloseTo(0);
  expect(samples.points.length).toEqual(0);
});

test('Calculation with one segment and 6cm position changes', () => {
  const path = new Path(new CustomPathConfig(), new Segment(new EndControl(60, 60, 0), new EndControl(66, 60, 90)));

  expect(path.controls[0].x).toEqual(60);
  expect(path.controls[0].y).toEqual(60);
  expect(path.controls[1].x).toEqual(66);
  expect(path.controls[1].y).toEqual(60);

  const samples = getBezierCurvePoints(path.segments[0], 1 / 100);
  expect(samples.length).toEqual(100);

  const arcLength = getBezierCurveArcLength(path.segments[0], 1);
  expect(arcLength).toEqual(6);

  const density = new Quantity(2, UnitOfLength.Centimeter);
  const segSamples = getSegmentSamplePoints(path.segments[0], density);
  expect(segSamples.length).toEqual(101);

  const pathSamples = getPathSamplePoints(path, density);
  expect(pathSamples.arcLength).toEqual(6);
  expect(pathSamples.points.length).toEqual(101);

  const uniformResult = getUniformPointsFromSamples(pathSamples, density);
  expect(uniformResult.points.length).toEqual(4);
  expect(uniformResult.points[0]).toMatchObject({ x: 60, y: 60, heading: 0 });
  expect(uniformResult.points[1]).toMatchObject({ x: 62, y: 60, heading: undefined });
  expect(uniformResult.points[2]).toMatchObject({ x: 64, y: 60, heading: undefined });
  expect(uniformResult.points[3]).toMatchObject({ x: 66, y: 60, heading: 90 });
});

// write a helper function to test an array with toMatchObject
function toMatchObjectArray<T>(received: T[], expected: Partial<T>[]) {
  expect(received.length).toEqual(expected.length);
  for (let i = 0; i < received.length; i++) {
    expect(received[i]).toMatchObject(expected[i]);
  }
}

test('Calculation with one segment and no position changes', () => {
  const path = new Path(new CustomPathConfig(), new Segment(
    new EndControl(60, 60, 0),
    new EndControl(60, 60, 90)));

  const density = new Quantity(2, UnitOfLength.Centimeter);
  const segSamples = getSegmentSamplePoints(path.segments[0], density);
  expect(segSamples.length).toEqual(101);

  const pathSamples = getPathSamplePoints(path, density);
  expect(pathSamples.arcLength).toBeCloseTo(0, 1);
  expect(pathSamples.points.length).toEqual(101);

  const uniformResult = getUniformPointsFromSamples(pathSamples, density);
  toMatchObjectArray(uniformResult.points, [
    { x: 60, y: 60, heading: 0, isLast: false },
    { x: 60, y: 60, heading: 90, isLast: true }
  ]);
  toMatchObjectArray(uniformResult.segmentIndexes, [
    { index: 0, from: 0, to: 2 }
  ]);
});

test('Calculation with one segment and 1cm position changes', () => {
  const path = new Path(new CustomPathConfig(), new Segment(
    new EndControl(60, 60, 0),
    new EndControl(61, 60, 90)));

  const density = new Quantity(2, UnitOfLength.Centimeter);
  const pathSamples = getPathSamplePoints(path, density);
  expect(pathSamples.arcLength).toBeCloseTo(1, 1);
  expect(pathSamples.points.length).toEqual(101);

  const uniformResult = getUniformPointsFromSamples(pathSamples, density);
  toMatchObjectArray(uniformResult.points, [
    { x: 60, y: 60, heading: 0, isLast: false },
    { x: 61, y: 60, heading: 90, isLast: true }
  ]);
  toMatchObjectArray(uniformResult.segmentIndexes, [
    { index: 0, from: 0, to: 2 }
  ]);
});

test('Calculation with one segment and 2cm position changes', () => {
  const path = new Path(new CustomPathConfig(), new Segment(
    new EndControl(60, 60, 0),
    new EndControl(62, 60, 90)));

  const density = new Quantity(2, UnitOfLength.Centimeter);
  const pathSamples = getPathSamplePoints(path, density);
  expect(pathSamples.arcLength).toBeCloseTo(2, 1);
  expect(pathSamples.points.length).toEqual(101);

  const uniformResult = getUniformPointsFromSamples(pathSamples, density);
  toMatchObjectArray(uniformResult.points, [
    { x: 60, y: 60, heading: 0, isLast: false },
    { x: 62, y: 60, heading: 90, isLast: true }
  ]);
  toMatchObjectArray(uniformResult.segmentIndexes, [
    { index: 0, from: 0, to: 2 }
  ]);
});

test('Calculation with one segment and 3cm position changes', () => {
  const path = new Path(new CustomPathConfig(), new Segment(
    new EndControl(60, 60, 0),
    new EndControl(63, 60, 90)));

  const density = new Quantity(2, UnitOfLength.Centimeter);
  const pathSamples = getPathSamplePoints(path, density);
  expect(pathSamples.arcLength).toBeCloseTo(3, 1);
  expect(pathSamples.points.length).toEqual(101);

  const uniformResult = getUniformPointsFromSamples(pathSamples, density);
  toMatchObjectArray(uniformResult.points, [
    { x: 60, y: 60, heading: 0, isLast: false },
    { x: 62, y: 60, heading: undefined, isLast: false },
    { x: 63, y: 60, heading: 90, isLast: true }
  ]);
  toMatchObjectArray(uniformResult.segmentIndexes, [
    { index: 0, from: 0, to: 3 }
  ]);
});

test('Calculation with two segments and no position changes', () => {
  const path = new Path(new CustomPathConfig(), new Segment(
    new EndControl(60, 60, 0),
    new EndControl(60, 60, 90)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last,
    new EndControl(60, 60, 180)
  ));

  const density = new Quantity(2, UnitOfLength.Centimeter);
  const pathSamples = getPathSamplePoints(path, density);
  expect(pathSamples.arcLength).toBeCloseTo(0, 1);
  expect(pathSamples.points.length).toEqual(201);

  const uniformResult = getUniformPointsFromSamples(pathSamples, density);
  toMatchObjectArray(uniformResult.points, [
    { x: 60, y: 60, heading: 0, isLast: true },
    { x: 60, y: 60, heading: 180, isLast: true }
  ]);
  toMatchObjectArray(uniformResult.segmentIndexes, [
    { index: 0, from: 0, to: 1 },
    { index: 1, from: 1, to: 2 }
  ]);
});

test('Calculation with two segments and 2cm position changes', () => {
  const path = new Path(new CustomPathConfig(), new Segment(
    new EndControl(60, 60, 0),
    new EndControl(62, 60, 90)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last,
    new EndControl(62, 60, 180)
  ));

  const density = new Quantity(2, UnitOfLength.Centimeter);
  const pathSamples = getPathSamplePoints(path, density);
  expect(pathSamples.arcLength).toBeCloseTo(2, 1);
  expect(pathSamples.points.length).toEqual(201);

  const uniformResult = getUniformPointsFromSamples(pathSamples, density);
  toMatchObjectArray(uniformResult.points, [
    { x: 60, y: 60, heading: 0, isLast: false },
    { x: 62, y: 60, heading: 90, isLast: true },
    { x: 62, y: 60, heading: 180, isLast: true }
  ]);
  toMatchObjectArray(uniformResult.segmentIndexes, [
    { index: 0, from: 0, to: 2 },
    { index: 1, from: 2, to: 3 }
  ]);
});

test('Calculation with two segments and 3cm position changes', () => {
  const path = new Path(new CustomPathConfig(), new Segment(
    new EndControl(60, 60, 0),
    new EndControl(63, 60, 90)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last,
    new EndControl(63, 60, 180)
  ));

  const density = new Quantity(2, UnitOfLength.Centimeter);
  const pathSamples = getPathSamplePoints(path, density);
  expect(pathSamples.arcLength).toBeCloseTo(3, 1);
  expect(pathSamples.points.length).toEqual(201);

  const uniformResult = getUniformPointsFromSamples(pathSamples, density);
  toMatchObjectArray(uniformResult.points, [
    { x: 60, y: 60, heading: 0, isLast: false },
    { x: 62, y: 60, heading: 90, isLast: true },
    { x: 63, y: 60, heading: 180, isLast: true }
  ]);
  toMatchObjectArray(uniformResult.segmentIndexes, [
    { index: 0, from: 0, to: 2 },
    { index: 1, from: 2, to: 3 }
  ]);
});

test('Calculation with three segments and 4cm position changes', () => {
  const path = new Path(new CustomPathConfig(), new Segment(
    new EndControl(60, 60, 0),
    new EndControl(62, 60, 90)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last,
    new EndControl(63, 60, 180)
  ));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last,
    new EndControl(64, 60, 270)
  ));

  const density = new Quantity(2, UnitOfLength.Centimeter);
  const pathSamples = getPathSamplePoints(path, density);
  expect(pathSamples.arcLength).toBeCloseTo(4, 1);
  expect(pathSamples.points.length).toEqual(301);

  const uniformResult = getUniformPointsFromSamples(pathSamples, density);
  toMatchObjectArray(uniformResult.points, [
    { x: 60, y: 60, heading: 0, isLast: false },
    { x: 62, y: 60, heading: 90, isLast: true },
    { x: 64, y: 60, heading: 270, isLast: true }
  ]);
  toMatchObjectArray(uniformResult.segmentIndexes, [
    { index: 0, from: 0, to: 2 },
    { index: 1, from: 2, to: 2 },
    { index: 2, from: 2, to: 3 }
  ]);
});

test('Calculation with three segments and 5cm position changes', () => {
  const path = new Path(new CustomPathConfig(), new Segment(
    new EndControl(60, 60, 0),
    new EndControl(62, 60, 90)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last,
    new EndControl(63, 60, 180)
  ));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last,
    new EndControl(65, 60, 270)
  ));

  const density = new Quantity(2, UnitOfLength.Centimeter);
  const pathSamples = getPathSamplePoints(path, density);
  expect(pathSamples.arcLength).toBeCloseTo(5, 1);
  expect(pathSamples.points.length).toEqual(301);

  const uniformResult = getUniformPointsFromSamples(pathSamples, density);
  toMatchObjectArray(uniformResult.points, [
    { x: 60, y: 60, heading: 0, isLast: false },
    { x: 62, y: 60, heading: 90, isLast: true },
    { x: 64, y: 60, heading: 180, isLast: true },
    { x: 65, y: 60, heading: 270, isLast: true }
  ]);
  toMatchObjectArray(uniformResult.segmentIndexes, [
    { index: 0, from: 0, to: 2 },
    { index: 1, from: 2, to: 3 },
    { index: 2, from: 3, to: 4 }
  ]);
});

test('Calculation with three segments and 7cm position changes', () => {
  const path = new Path(new CustomPathConfig(), new Segment(
    new EndControl(60, 60, 0),
    new EndControl(65, 60, 90)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last,
    new EndControl(66, 60, 180)
  ));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last,
    new EndControl(67, 60, 270)
  ));

  const density = new Quantity(2, UnitOfLength.Centimeter);
  const pathSamples = getPathSamplePoints(path, density);
  expect(pathSamples.arcLength).toBeCloseTo(7, 1);
  expect(pathSamples.points.length).toEqual(301);

  const uniformResult = getUniformPointsFromSamples(pathSamples, density);
  toMatchObjectArray(uniformResult.points, [
    { x: 60, y: 60, heading: 0, isLast: false },
    { x: 62, y: 60, heading: undefined, isLast: false },
    { x: 64, y: 60, heading: 90, isLast: true }, // should be true
    { x: 66, y: 60, heading: 180, isLast: true },
    { x: 67, y: 60, heading: 270, isLast: true }
  ]);
  toMatchObjectArray(uniformResult.segmentIndexes, [
    { index: 0, from: 0, to: 3 },
    { index: 1, from: 3, to: 4 },
    { index: 2, from: 4, to: 5 }
  ]);
});

test('Calculation with two segments edge case 1', () => {
  // it finishes all samples before t=1

  const path = new Path(new CustomPathConfig(), new Segment(
    new EndControl(0, 0, 0),
    new EndControl(10, 0, 0)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last,
    new Control(10, 103.71910889077459),
    new Control(0, 80),
    new EndControl(40, 60, 0)
  ));

  const density = new Quantity(2, UnitOfLength.Centimeter);
  const pathSamples = getPathSamplePoints(path, density);
  const uniformResult = getUniformPointsFromSamples(pathSamples, density);
  expect(uniformResult.points.length).toEqual(62);
  expect(uniformResult.points[0]).toMatchObject({ x: 0, y: 0, heading: 0, isLast: false });
  expect(uniformResult.points[61]).toMatchObject({ x: 40, y: 60, heading: 0, isLast: true });
  toMatchObjectArray(uniformResult.segmentIndexes, [
    { index: 0, from: 0, to: 6 },
    { index: 1, from: 6, to: 62 },
  ]);
});

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
  expect(fromHeadingInDegreeToAngleInRadian(269.9)).toBeCloseTo(fromDegreeToRadian(-179.9));
  expect(fromHeadingInDegreeToAngleInRadian(270)).toBeCloseTo(fromDegreeToRadian(180));
  expect(fromHeadingInDegreeToAngleInRadian(271)).toBeCloseTo(fromDegreeToRadian(179));
  expect(fromHeadingInDegreeToAngleInRadian(359)).toBeCloseTo(fromDegreeToRadian(91));
  expect(fromHeadingInDegreeToAngleInRadian(91)).toBeCloseTo(fromDegreeToRadian(-1));
});

test("fromAngleInRadianToHeadingInDegree", () => {
  expect(fromAngleInRadianToHeadingInDegree(fromDegreeToRadian(90))).toBeCloseTo(0);
  expect(fromAngleInRadianToHeadingInDegree(fromDegreeToRadian(0))).toBeCloseTo(90);
  expect(fromAngleInRadianToHeadingInDegree(fromDegreeToRadian(-90))).toBeCloseTo(180);
  expect(fromAngleInRadianToHeadingInDegree(fromDegreeToRadian(-179.9))).toBeCloseTo(269.9);
  expect(fromAngleInRadianToHeadingInDegree(fromDegreeToRadian(180))).toBeCloseTo(270);
  expect(fromAngleInRadianToHeadingInDegree(fromDegreeToRadian(179))).toBeCloseTo(271);
  expect(fromAngleInRadianToHeadingInDegree(fromDegreeToRadian(91))).toBeCloseTo(359);
  expect(fromAngleInRadianToHeadingInDegree(fromDegreeToRadian(-1))).toBeCloseTo(91);
});

test("fromHeadingInDegreeToAngleInRadian <-> fromAngleInRadianToHeadingInDegree", () => {
  for(let i = -720; i < 1080; i+=0.1) {
    expect(fromAngleInRadianToHeadingInDegree(fromHeadingInDegreeToAngleInRadian(i))).toBeCloseTo(boundHeading(i));
  }
  for (let i = -Math.PI * 4; i < Math.PI * 6; i += 0.1) {
    expect(fromHeadingInDegreeToAngleInRadian(fromAngleInRadianToHeadingInDegree(i))).toBeCloseTo(boundAngle(i));
  }
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
