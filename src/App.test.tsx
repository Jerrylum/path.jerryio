import { makeAutoObservable } from "mobx"

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MainApp } from './app/MainApp';
import { Control, EndPointControl, Path, Spline, Vertex } from './math/Path';

import { plainToClassFromExist, plainToInstance } from 'class-transformer';
import { instanceToPlain } from 'class-transformer';
import { GeneralConfig, OutputConfig, SpeedConfig } from './format/Config';
import { Format, PathFileData } from './format/Format';
import { UnitOfLength } from "./math/Unit";
import DOMPurify from "dompurify";

class CustomFormat implements Format {
  isInit: boolean;
  uid: string;

  constructor() {
    this.isInit = false;
    this.uid = "custom";
  }

  getName(): string {
    return "Custom";
  }
  init(): void {
    this.isInit = true;
  }
  buildGeneralConfig(): GeneralConfig {
    return new CustomGeneralConfig();
  }
  buildSpeedConfig(): SpeedConfig {
    throw new Error('Method not implemented.');
  }
  buildOutputConfig(): OutputConfig {
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
  showRobot: boolean = true;
  uol: UnitOfLength = UnitOfLength.Inch;
  knotDensity: number = 2; // inches
  controlMagnetDistance: number = 5 / 2.54;

  constructor() {
    makeAutoObservable(this);
  }

  getConfigPanel(): JSX.Element {
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

test('Format serialize', () => {
  const app = new MainApp();

  app.format = new CustomFormat();
  app.gc = app.format.buildGeneralConfig();

  let p = instanceToPlain(app.gc);
  let gc2 = plainToClassFromExist(app.format.buildGeneralConfig(), p);
  let p2 = instanceToPlain(gc2);

  expect(p).toEqual(p2);
  expect(app.gc === gc2).toBeFalsy();
});

test('Spline serialize', () => {
  let s = new Spline(new EndPointControl(-12, -34, 9), [], new EndPointControl(-56, 78, 0));
  let p = instanceToPlain(s);
  let s2 = plainToInstance(Spline, p);
  let p2 = instanceToPlain(s2);

  expect(p).toEqual(p2);
});

test('Path serialize', () => {
  let r = new Path(new Spline(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0)));
  let p = instanceToPlain(r);
  let r2 = plainToInstance(Path, p);
  let p2 = instanceToPlain(r2);

  expect(p).toEqual(p2);
});

test('Path[] serialize', () => {
  let r = [new Path(new Spline(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0)))];
  let p = instanceToPlain(r);
  let r2 = plainToInstance(Path, p);
  let p2 = instanceToPlain(r2);

  expect(p).toEqual(p2);
});
