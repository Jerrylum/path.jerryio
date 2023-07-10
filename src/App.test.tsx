import { makeAutoObservable, action } from "mobx"

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MainApp } from './core/MainApp';
import { Control, EndPointControl, Path, Segment, Vector, construct, traversal } from './core/Path';

import { plainToClassFromExist, plainToInstance } from 'class-transformer';
import { instanceToPlain } from 'class-transformer';
import { GeneralConfig, PathConfig } from './format/Config';
import { Format, PathFileData } from './format/Format';
import { Quantity, UnitOfLength } from "./core/Unit";
import DOMPurify from "dompurify";
import { NumberRange } from "./component/RangeSlider";
import { PointCalculationResult, getBezierCurveArcLength, getBezierCurvePoints, getPathSamplePoints, getSegmentSamplePoints, getUniformPointsFromSamples, toDerivativeHeading } from "./core/Calculation";

class CustomFormat implements Format {
  isInit: boolean;
  uid: string;

  constructor() {
    this.isInit = false;
    this.uid = "custom";
  }

  createNewInstance(): Format {
    return new CustomFormat();
  }

  getName(): string {
    return "Custom";
  }
  init(): void {
    this.isInit = true;
  }
  getGeneralConfig(): GeneralConfig {
    return new CustomGeneralConfig();
  }
  buildPathConfig(): PathConfig {
    return new CustomPathConfig();
  }
  getPathPoints(path: Path): PointCalculationResult {
    throw new Error("Method not implemented.");
  }
  recoverPathFileData(fileContent: string): PathFileData {
    throw new Error("Method not implemented.");
  }
  exportPathFile(app: MainApp): string {
    throw new Error('Method not implemented.');
  }
}

class CustomGeneralConfig implements GeneralConfig {
  public custom: string = "custom";

  robotWidth: number = 12;
  robotHeight: number = 12;
  robotIsHolonomic: boolean = false;
  showRobot: boolean = true;
  uol: UnitOfLength = UnitOfLength.Inch;
  pointDensity: number = 2; // inches
  controlMagnetDistance: number = 5 / 2.54;

  constructor() {
    makeAutoObservable(this);
  }

  get format(): Format {
    throw new Error("Method not implemented.");
  }

  getConfigPanel(app: MainApp): JSX.Element {
    throw new Error("Method not implemented.");
  }
}

class CustomPathConfig implements PathConfig {
  public custom: string = "custom";

  speedLimit: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 127, label: "127" },
    step: 1,
    from: 20,
    to: 100,
  };
  bentRateApplicableRange: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 4, label: "4" },
    step: 0.01,
    from: 1.4,
    to: 1.8,
  };

  constructor() {
    makeAutoObservable(this);
  }

  get format(): Format {
    throw new Error("Method not implemented.");
  }

  getConfigPanel(app: MainApp): JSX.Element {
    throw new Error("Method not implemented.");
  }
}

test('Sanitize', () => {
  // render(<App />);
  // const linkElement = screen.getByText(/learn react/i);
  // expect(linkElement).toBeInTheDocument();

  const purify = DOMPurify();

  expect(purify.isSupported).toBeTruthy();

  expect(purify.sanitize("<script>alert('hello')</script>")).toEqual("");
});

test('Export test', () => {
  const app = new MainApp();

  const plain = JSON.stringify(app.exportPathFileData());

  app.importPathFileData(JSON.parse(plain));

  const plain2 = JSON.stringify(app.exportPathFileData());

  expect(plain).toEqual(plain2);
});

test('Format serialize', action(() => {
  const app = new MainApp();

  app.format = new CustomFormat();

  let p = instanceToPlain(app.gc);
  let gc2 = plainToClassFromExist(app.format.getGeneralConfig(), p);
  let p2 = instanceToPlain(gc2);

  expect(p).toEqual(p2);
  expect(app.gc === gc2).toBeFalsy();
}));

test('Segment serialize', () => {
  let s = new Segment(new EndPointControl(-12, -34, 9), [], new EndPointControl(-56, 78, 0));
  let p = instanceToPlain(s);
  let s2 = plainToInstance(Segment, p);
  let p2 = instanceToPlain(s2);

  expect(p).toEqual(p2);
});

test('Path serialize', () => {
  let format = new CustomFormat();
  let r = new Path(format.buildPathConfig(), new Segment(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0)));
  let p = instanceToPlain(r);
  let r2 = plainToInstance(Path, p);
  let p2 = instanceToPlain(r2);

  expect(p).toEqual(p2);
});

test('Path[] serialize', () => {
  let format = new CustomFormat();
  let r = [new Path(format.buildPathConfig(), new Segment(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0)))];
  let p = instanceToPlain(r);
  let r2 = plainToInstance(Path, p);
  let p2 = instanceToPlain(r2);

  expect(p).toEqual(p2);
});

test('Calculation with one segment and 6cm position changes', () => {
  const path = new Path(new CustomPathConfig(), new Segment(new EndPointControl(60, 60, 0), [], new EndPointControl(66, 60, 90)));

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
    new EndPointControl(60, 60, 0), [],
    new EndPointControl(60, 60, 90)));

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
    new EndPointControl(60, 60, 0), [],
    new EndPointControl(61, 60, 90)));

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
    new EndPointControl(60, 60, 0), [],
    new EndPointControl(62, 60, 90)));

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
    new EndPointControl(60, 60, 0), [],
    new EndPointControl(63, 60, 90)));

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
    new EndPointControl(60, 60, 0), [],
    new EndPointControl(60, 60, 90)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last, [],
    new EndPointControl(60, 60, 180)
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
    new EndPointControl(60, 60, 0), [],
    new EndPointControl(62, 60, 90)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last, [],
    new EndPointControl(62, 60, 180)
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
    new EndPointControl(60, 60, 0), [],
    new EndPointControl(63, 60, 90)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last, [],
    new EndPointControl(63, 60, 180)
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
    new EndPointControl(60, 60, 0), [],
    new EndPointControl(62, 60, 90)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last, [],
    new EndPointControl(63, 60, 180)
  ));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last, [],
    new EndPointControl(64, 60, 270)
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
    new EndPointControl(60, 60, 0), [],
    new EndPointControl(62, 60, 90)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last, [],
    new EndPointControl(63, 60, 180)
  ));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last, [],
    new EndPointControl(65, 60, 270)
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
    new EndPointControl(60, 60, 0), [],
    new EndPointControl(65, 60, 90)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last, [],
    new EndPointControl(66, 60, 180)
  ));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last, [],
    new EndPointControl(67, 60, 270)
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
    new EndPointControl(0, 0, 0), [],
    new EndPointControl(10, 0, 0)));

  path.segments.push(new Segment(
    path.segments[path.segments.length - 1].last,
    [
      new Control(10, 103.71910889077459),
      new Control(0, 80),
    ],
    new EndPointControl(40, 60, 0)
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

test('toDerivativeHeading', () => {
  expect(toDerivativeHeading(0, 270)).toBe(-90);
  expect(toDerivativeHeading(270, 0)).toBe(90);
  expect(toDerivativeHeading(0, 90)).toBe(90);
  expect(toDerivativeHeading(90, 0)).toBe(-90);
  expect(toDerivativeHeading(0, 180)).toBe(-180);
  expect(toDerivativeHeading(180, 0)).toBe(-180);
});

test('traversal and construct', () => {
  const i1 = new EndPointControl(1, 0, 0);
  const i2 = new Control(2, 0);
  const i3 = new Control(3, 0);
  const i4 = new EndPointControl(4, 0, 0);
  const i5 = new Control(5, 0);
  const i6 = new Control(6, 0);
  const i7 = new EndPointControl(7, 0, 0);
  const i8 = new Control(8, 0);
  const i9 = new Control(9, 0);
  const i10 = new EndPointControl(10, 0, 0);
  const i11 = new EndPointControl(11, 0, 0);
  const i12 = new Control(12, 0);
  const i13 = new Control(13, 0);
  const i14 = new EndPointControl(14, 0, 0);
  const i15 = new EndPointControl(15, 0, 0);
  const i16 = new EndPointControl(16, 0, 0);
  const i17 = new Control(17, 0);
  const i18 = new Control(18, 0);
  const i19 = new EndPointControl(19, 0, 0);
  const i0 = new Path(new CustomPathConfig(), new Segment(i1, [], i4));

  const i21 = new EndPointControl(21, 0, 0);
  const i22 = new EndPointControl(22, 0, 0);
  const i23 = new Control(23, 0);
  const i24 = new Control(24, 0);
  const i25 = new EndPointControl(25, 0, 0);
  const i26 = new EndPointControl(26, 0, 0);
  const i20 = new Path(new CustomPathConfig(), new Segment(i1, [], i4));

  const expected = [
    i0, i1, i2, i3, i4, i5, i6, i7, i8, i9, i10,
    i11, i12, i13, i14, i15, i16, i17, i18, i19, i20,
    i21, i22, i23, i24, i25, i26];

  const removed = construct(expected);

  const actual = traversal([i0, i20]);

  expect(removed).toEqual([]);
  expect(actual).toEqual(expected);
});

test('construct removal', () => {
  const i1 = new Control(1, 0);
  const i2 = new Control(2, 0);
  const i3 = new EndPointControl(3, 0, 0);
  const i4 = new Control(4, 0);
  const i5 = new Control(5, 0);
  const i6 = new EndPointControl(6, 0, 0);
  const i7 = new Control(7, 0);
  const i8 = new Control(8, 0);
  const i9 = new Control(9, 0);
  const i10 = new EndPointControl(10, 0, 0);
  const i11 = new EndPointControl(11, 0, 0);
  const i12 = new Control(12, 0);
  const i13 = new EndPointControl(13, 0, 0);
  const i14 = new EndPointControl(14, 0, 0);
  const i15 = new EndPointControl(15, 0, 0);
  const i16 = new Control(16, 0);
  const i17 = new Control(17, 0);
  const i0 = new Path(new CustomPathConfig(), new Segment(i3, [], i6));

  const i19 = new Control(19, 0);
  const i20 = new Control(20, 0);
  const i21 = new EndPointControl(21, 0, 0);
  const i18 = new Path(new CustomPathConfig(), new Segment(i21, [], i21));

  const original = [
    i0, i1, i2, i3, i4, i5, i6, i7, i8, i9, i10,
    i11, i12, i13, i14, i15, i16, i17, i18, i19, i20,
    i21];

  const expected = [
    i0, i3, i4, i5, i6, i7, i9, i10,
    i11, i13, i14, i15, i18];

  const removed = construct(original);

  const actual = traversal([i0, i18]);

  expect(removed).toEqual([i1, i2, i8, i12, i16, i17, i19, i20, i21]);
  expect(actual).toEqual(expected);
});
