import { Path, Segment } from "../core/Path";
import { GeneralConfig } from "./Config";
import { PointCalculationResult } from "../core/Calculation";
import { APP_VERSION, MainApp } from "../core/MainApp";
import { Range } from "semver";
import { UnitOfLength } from "../core/Unit";
import { LemLibFormatV0_4 } from "./LemLibFormatV0_4";
import { PathDotJerryioFormatV0_1 } from "./PathDotJerryioFormatV0_1";
import { LemLibOdomGeneratorFormatV0_4 } from "./LemLibOdomGeneratorFormatV0_4";
import { CancellableCommand, ExecutionEventListenersContainer } from "../core/Command";
import { LemLibFormatV1_0 } from "./LemLibFormatV1_0";
import { isExperimentalFeaturesEnabled } from "../core/Preferences";

export interface Format extends ExecutionEventListenersContainer<CancellableCommand> {
  isInit: boolean;
  uid: string;

  getName(): string;

  register(app: MainApp): void;

  unregister(app: MainApp): void;

  createNewInstance(): Format;

  getGeneralConfig(): GeneralConfig;

  createPath(...segments: Segment[]): Path;

  getPathPoints(path: Path): PointCalculationResult;

  /**
   * Convert the old format to the new format.
   *
   * The format implementation will call convertFormat() and may have custom conversion logic after calling convertFormat().
   *
   * @param oldFormat the old format
   * @param oldPaths the old paths
   * @returns the new paths with "this" as the new format
   */
  convertFromFormat(oldFormat: Format, oldPaths: Path[]): Path[];

  /**
   * SECURITY: The input is not safe.
   * The returned value is valid but might contain malicious code.
   *
   * This function is responsible for parsing the file buffer and creating the path objects.
   * It is also responsible for validating the file format since the returned value is trusted.
   * Upon calling this function, the internal state of the format will be changed.
   * This format is then used in the MainApp.
   * If the file format is incorrect, an error will be thrown.
   *
   * @throws Error if the file format can not be parsed
   * @param buffer the path file buffer in ArrayBuffer
   * @returns the path objects
   */
  importPathsFromFile(buffer: ArrayBuffer): Path[];

  /**
   * SECURITY: The input and the returned value are not safe.
   * The returned value might be invalid and contain malicious code.
   *
   * The internal state of the format should not be changed after calling this function.
   *
   * @throws Error if an error occurs during parsing the file
   * @param buffer the path file buffer in ArrayBuffer
   * @returns the PATH.JERRYIO-DATA in JSON format or undefined if PATH.JERRYIO-DATA is not found
   */
  importPDJDataFromFile(buffer: ArrayBuffer): Record<string, any> | undefined;

  /**
   * @throws Error if the file can not be exported
   * @returns the path file buffer in ArrayBuffer
   */
  exportFile(): ArrayBuffer;
}

export function getAllFormats(): Format[] {
  return [
    ...[
      new LemLibFormatV0_4(), //
      new LemLibOdomGeneratorFormatV0_4()
    ],
    ...(isExperimentalFeaturesEnabled() ? [new LemLibFormatV1_0()] : []),
    ...[new PathDotJerryioFormatV0_1()]
  ];
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

const convertFromV0_3_0ToV0_4_0: PathFileDataConverter = {
  version: new Range("~0.3"),
  convert: (data: Record<string, any>): void => {
    // the field image is using the default field image

    // From v0.3.0 to v0.4.0
    data.appVersion = "0.4.0";
  }
};

const convertFromV0_4_0ToV0_5_0: PathFileDataConverter = {
  version: new Range("~0.4"),
  convert: (data: Record<string, any>): void => {
    // No conversion needed

    // From v0.4.0 to v0.5.0
    data.appVersion = "0.5.0";
  }
};

const convertFromV0_5_0ToCurrentAppVersion: PathFileDataConverter = {
  version: new Range("~0.5"),
  convert: (data: Record<string, any>): void => {
    // From v0.5.0 to current app version
    data.appVersion = APP_VERSION.version;
  }
};

export function convertPathFileData(data: Record<string, any>): boolean {
  for (const { version, convert } of [
    convertFromV0_1_0ToV0_2_0,
    convertFromV0_2_0ToV0_3_0,
    convertFromV0_3_0ToV0_4_0,
    convertFromV0_4_0ToV0_5_0,
    convertFromV0_5_0ToCurrentAppVersion
  ]) {
    if (version.test(data.appVersion)) {
      convert(data);
      return true;
    }
  }
  return false;
}

/**
 * Import the PATH.JERRYIO data from a text file. It is a common function for all formats with text path file.
 *
 * @throws Error if the file format is incorrect, for example, the json is not valid
 * @param buffer the PATH.JERRYIO data in JSON format
 * @returns the path file data or undefined if the file path file data is not found
 */
export function importPDJDataFromTextFile(buffer: ArrayBuffer): Record<string, any> | undefined {
  const fileContent = new TextDecoder().decode(buffer);
  const lineWithPathDotJerryioData = fileContent.split("\n").find(line => line.startsWith("#PATH.JERRYIO-DATA"));
  if (lineWithPathDotJerryioData === undefined) return undefined;

  const pathFileDataInString = lineWithPathDotJerryioData.substring("#PATH.JERRYIO-DATA".length).trim();
  const data = JSON.parse(pathFileDataInString);

  return data;
}
