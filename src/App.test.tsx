import { makeAutoObservable, action } from "mobx"

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MainApp } from './core/MainApp';
import { Control, EndPointControl, Path, Segment, Vector, construct, traversal } from './core/Path';

import { Exclude, Expose, plainToClassFromExist, plainToInstance } from 'class-transformer';
import { instanceToPlain } from 'class-transformer';
import { GeneralConfig, PathConfig } from './format/Config';
import { Format, PathFileData } from './format/Format';
import { Quantity, UnitOfLength } from "./core/Unit";
import DOMPurify from "dompurify";
import { NumberRange } from "./component/RangeSlider";
import { PointCalculationResult, boundHeading, findClosestPointOnLine, findLinesIntersection, fromDegreeToRadian, fromHeadingInDegreeToAngleInRadian, getBezierCurveArcLength, getBezierCurvePoints, getPathSamplePoints, getSegmentSamplePoints, getUniformPointsFromSamples, toDerivativeHeading } from "./core/Calculation";
import { Coordinate, CoordinateWithHeading, EuclideanTransformation } from "./core/Coordinate";

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
  createPath(...segments: Segment[]): Path {
    return new Path(new CustomPathConfig(), ...segments);
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

  @Expose()
  robotWidth: number = 12;
  @Expose()
  robotHeight: number = 12;
  @Expose()
  robotIsHolonomic: boolean = false;
  @Expose()
  showRobot: boolean = true;
  @Expose()
  uol: UnitOfLength = UnitOfLength.Inch;
  @Expose()
  pointDensity: number = 2; // inches
  @Expose()
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
  @Expose()
  public custom: string = "custom";

  @Exclude()
  public path!: Path;

  @Expose()
  speedLimit: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 127, label: "127" },
    step: 1,
    from: 20,
    to: 100,
  };
  @Expose()
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
  let gc2 = plainToClassFromExist(app.format.getGeneralConfig(), p, { excludeExtraneousValues: true, exposeDefaultValues: true });
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
  let r = format.createPath(new Segment(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0)));
  let p = instanceToPlain(r);
  let r2 = format.createPath();
  plainToClassFromExist(r2, p, { excludeExtraneousValues: true, exposeDefaultValues: true });
  let p2 = instanceToPlain(r2);

  expect(p).toEqual(p2);
});

test('Path[] serialize', () => {
  let format = new CustomFormat();
  let r = [format.createPath(new Segment(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0)))];
  let p = instanceToPlain(r);
  let r2 = format.createPath();
  plainToClassFromExist(r2, p[0], { excludeExtraneousValues: true, exposeDefaultValues: true });
  let p2 = instanceToPlain(r2);

  expect(p[0]).toEqual(p2);
});

class TestClass {
  @Expose()
  attr1 = 1;
  @Expose()
  attr2 = "2";
  @Expose()
  attr3 = true;
  // No @Expose()
  attr5 = "5";
  @Exclude()
  attr6 = "6";
  @Expose()
  attr7 = "7";
}

test('Class transform', () => {
  const result = plainToClassFromExist(new TestClass(), { attr1: 3, attr2: "4", attr3: false, attr4: "hey", attr5: "-1", attr6: "-2" }, { excludeExtraneousValues: true, exposeDefaultValues: true });

  expect(result.attr1).toEqual(3);
  expect(result.attr2).toEqual("4");
  expect(result.attr3).toEqual(false);
  expect((result as any).attr4).toBeUndefined();
  expect(result.attr5).toEqual("5");
  expect(result.attr6).toEqual("6");
  expect(result.attr7).toEqual("7");
});
