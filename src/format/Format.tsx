import { Path, Segment } from "@core/Path";
import { GeneralConfig } from "./Config";
import { PointCalculationResult } from "@core/Calculation";
import { APP_VERSION, MainApp } from "@core/MainApp";
import { Range } from "semver";
import { UserInterface } from "@core/Layout";
import { UnitOfLength } from "@core/Unit";
import { LemLibFormatV0_4 } from "./LemLibFormatV0_4";
import { PathDotJerryioFormatV0_1 } from "./PathDotJerryioFormatV0_1";
import { LemLibOdomGeneratorFormatV0_4 } from "./LemLibOdomGeneratorFormatV0_4";
import { LemLibFormatV1_0 } from "./LemLibFormatV1_0";
import { isExperimentalFeaturesEnabled } from "@core/Preferences";
import { RigidCodeGenFormatV0_1 } from "./RigidCodeGenFormatV0_1";
import { MoveToPointCodeGenFormatV0_1 } from "./MoveToPointCodeGenFormatV0_1";

export interface Format {
  isInit: boolean;
  uid: string;

  getName(): string;

  getDescription(): string;

  /**
   * Registers the format with the provided application and user interface.
   * This method should set up any necessary event listeners, hooks, or UI components specific to the format.
   * The `register` function should be the first function to call on the format. This is triggered when MainApp changes format.
   * @param app The MainApp instance
   * @param ui The UserInterface instances
   */
  register(app: MainApp, ui: UserInterface): void;

  /**
   * Unregisters the format from the application.
   * This should clean up and remove any hooks, event listeners, or UI components that were added during the registration process.
   * The `unregister` function should be the last function to call on the format. After it is called, the format is expected to be detached from the application. This is triggered when MainApp changes format.
   */
  unregister(): void;

  /**
   * Creates a new instance of this format
   * @returns a new instance of this format
   */
  createNewInstance(): Format;

  /**
   * Gets the general configuration for this format
   * This method provides access to the general configuration settings to this format.
   * @returns the general configuration for this format
   */
  getGeneralConfig(): GeneralConfig;

  /**
   * Creates a path instance with the given segments
   * @param segments the segments to create the path
   * @returns the created path instance
   */
  createPath(...segments: Segment[]): Path;

  /**
   * Calculates the waypoints along a given path
   * The points' speed may recalculated based on each format
   * @param path the path to get the points
   * @returns the calculation result points along the given path
   */
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

export function getAllGeneralFormats(): Format[] {
  return [new LemLibFormatV0_4(), new PathDotJerryioFormatV0_1()];
}

export function getAllDeprecatedFormats(): Format[] {
  return [new LemLibOdomGeneratorFormatV0_4()];
}

export function getAllExperimentalFormats(): Format[] {
  if (!isExperimentalFeaturesEnabled()) return [];
  return [new LemLibFormatV1_0(), new RigidCodeGenFormatV0_1(), new MoveToPointCodeGenFormatV0_1()];
}

export function getAllFormats(): Format[] {
  return [...getAllGeneralFormats(), ...getAllDeprecatedFormats(), ...getAllExperimentalFormats()];
}

interface PathFileDataConverter {
  version: Range;
  convert: (data: Record<string, any>) => void;
}

const convertFromV0_1_0ToV0_2_0: PathFileDataConverter = {
  version: new Range("~0.1"),
  convert: (data: Record<string, any>): void => {
    // Convert old enum number to new enum ratio
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

const convertFromV0_5_0ToV0_6_0: PathFileDataConverter = {
  version: new Range("~0.5"),
  convert: (data: Record<string, any>): void => {
    // New algorithm for bent rate, remove the old bent rate applicable range
    for (const path of data.paths) path.pc.bentRateApplicableRange = undefined;

    // From v0.5.0 to v0.6.0
    data.appVersion = "0.6.0";
  }
};

const convertFromV0_6_0ToV0_7_0: PathFileDataConverter = {
  version: new Range("~0.6"),
  convert: (data: Record<string, any>): void => {
    // No conversion needed

    // From v0.6.0 to v0.7.0
    data.appVersion = "0.7.0";
  }
};

const convertFromV0_7_0ToV0_8_0: PathFileDataConverter = {
  version: new Range("~0.7"),
  convert: (data: Record<string, any>): void => {
    if (data.format === "LemLib v0.4.x (inch, byte-voltage)") {
      data.format = "LemLib v0.5";
    } else if (data.format === "path.jerryio v0.1.x (cm, rpm)") {
      data.format = "path.jerryio v0.1";
    } else if (data.format === "LemLib Odom Code Gen v0.4.x (inch)") {
      data.format = "LemLib Odom Code Gen v0.4";
    } else if (data.format === "LemLib v1.0.0 (mm, m/s)") {
      data.format = "LemLib v1.0";
    } else if (data.format === "Move-to-Point Code Gen v0.1.x") {
      data.format = "Move-to-Point Code Gen v0.1";
    } else if (data.format === "Rigid Code Gen v0.1.x") {
      data.format = "Rigid Code Gen v0.1";
    }

    // From v0.7.0 to v0.8.0
    data.appVersion = "0.8.0";
  }
};

const convertFromV0_8_0ToCurrentAppVersion: PathFileDataConverter = {
  version: new Range("~0.8"),
  convert: (data: Record<string, any>): void => {
    // From v0.8.0 to current app version
    data.appVersion = APP_VERSION.version;
  }
};

export function convertPathFileData(data: Record<string, any>): boolean {
  for (const { version, convert } of [
    convertFromV0_1_0ToV0_2_0,
    convertFromV0_2_0ToV0_3_0,
    convertFromV0_3_0ToV0_4_0,
    convertFromV0_4_0ToV0_5_0,
    convertFromV0_5_0ToV0_6_0,
    convertFromV0_6_0ToV0_7_0,
    convertFromV0_7_0ToV0_8_0,
    convertFromV0_8_0ToCurrentAppVersion
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
