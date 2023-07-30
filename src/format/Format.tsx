import { APP_VERSION } from "../core/MainApp";
import { Path, Segment } from "../core/Path";
import { LemLibFormatV0_4 } from "./LemLibFormatV0_4";
import { PathDotJerryioFormatV0_1 } from "./PathDotJerryioFormatV0_1";
import { GeneralConfig } from "./Config";
import { Range } from "semver";
import { UnitOfLength } from "../core/Unit";
import { PointCalculationResult } from "../core/Calculation";

export interface Format {
  isInit: boolean;
  uid: string;

  getName(): string;

  init(): void;

  createNewInstance(): Format;

  getGeneralConfig(): GeneralConfig;

  createPath(...segments: Segment[]): Path;

  getPathPoints(path: Path): PointCalculationResult;

  recoverPathFileData(fileContent: string): PathFileData;

  exportPathFile(): string; // return file content
}

export function getAllFormats(): Format[] {
  return [
    new LemLibFormatV0_4(), //
    new PathDotJerryioFormatV0_1()
  ];
}

export interface PathFileData {
  gc: GeneralConfig;
  paths: Path[];
}

interface PathFileDataConverter {
  version: Range;
  convert: (data: Record<string, any>) => void;
}

const convertFromV0_1_0ToV0_2_0: PathFileDataConverter = {
  version: new Range("~0.1"),
  convert: (data: Record<string, any>): void => {
    // Covert old enum number to new enum ratio
    data.gc.uol = {
      1: UnitOfLength.Millimeter,
      2: UnitOfLength.Centimeter,
      3: UnitOfLength.Meter,
      4: UnitOfLength.Inch,
      5: UnitOfLength.Foot
    }[data.gc.uol as number];

    // From v0.1.0 to v0.2.0
    data.appVersion = "0.2.0";
  }
};

const convertFromV0_2_0ToV0_3_0: PathFileDataConverter = {
  version: new Range("~0.2"),
  convert: (data: Record<string, any>): void => {
    if (data.format === "LemLib v0.4.x (inch, byte-voltage)") {
      for (const path of data.paths) path.pc.maxDecelerationRate = 127;
    }

    // From v0.2.0 to v0.3.0
    data.appVersion = "0.3.0";
  }
};

const convertFromV0_3_0ToCurrentAppVersion: PathFileDataConverter = {
  version: new Range("~0.3"),
  convert: (data: Record<string, any>): void => {
    // From v0.3.0 to current app version
    data.appVersion = APP_VERSION.version;
  }
};

export function convertPathFileData(data: Record<string, any>): boolean {
  for (const { version, convert } of [
    convertFromV0_1_0ToV0_2_0,
    convertFromV0_2_0ToV0_3_0,
    convertFromV0_3_0ToCurrentAppVersion
  ]) {
    if (version.test(data.appVersion)) {
      convert(data);
      return true;
    }
  }
  return false;
}
