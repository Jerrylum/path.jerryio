import { reaction, action, intercept } from "mobx";
import { UnitConverter, UnitOfLength } from "@core/Unit";
import { Format } from "./Format";
import { BentRateApplicationDirection, Path } from "@core/Path";
import { FieldImageOriginType, FieldImageSignatureAndOrigin, getDefaultBuiltInFieldImage } from "@core/Asset";
import { EditableNumberRange, NumberRange } from "@core/Util";
import { getAppStores } from "@core/MainApp";

export function convertGeneralConfigUOL(gc: GeneralConfig, fromUOL: UnitOfLength) {
  const toUOL = gc.uol;
  const uc = new UnitConverter(fromUOL, toUOL);

  gc.robotWidth = uc.fromAtoB(gc.robotWidth);
  gc.robotHeight = uc.fromAtoB(gc.robotHeight);
  gc.pointDensity = uc.fromAtoB(gc.pointDensity);
  gc.controlMagnetDistance = uc.fromAtoB(gc.controlMagnetDistance);
}

export function convertFormat(newFormat: Format, oldFormat: Format, oldPaths: Path[]): Path[] {
  const oldGC = oldFormat.getGeneralConfig();
  const newGC = newFormat.getGeneralConfig(); // == this.gc

  const keepPointDensity = newGC.pointDensity;

  newGC.robotWidth = oldGC.robotWidth;
  newGC.robotHeight = oldGC.robotHeight;
  convertGeneralConfigUOL(newGC, oldGC.uol);
  newGC.pointDensity = keepPointDensity; // UX: Use new format point density
  newGC.fieldImage = oldGC.fieldImage;

  const newPaths: Path[] = [];
  for (const oldPath of oldPaths) {
    const newPath = newFormat.createPath(...oldPath.segments);
    const newPC = newPath.pc;

    newPath.name = oldPath.name;
    newPath.visible = oldPath.visible;
    newPath.lock = oldPath.lock;

    if (
      newPC.speedLimit.minLimit === oldPath.pc.speedLimit.minLimit &&
      newPC.speedLimit.maxLimit === oldPath.pc.speedLimit.maxLimit
    ) {
      newPC.speedLimit = oldPath.pc.speedLimit; // UX: Keep speed limit if the new format has the same speed limit range as the old one
    }
    newPC.bentRateApplicableRange = oldPath.pc.bentRateApplicableRange; // UX: Keep application range

    newPaths.push(newPath);
  }

  return newPaths;
}

export function initGeneralConfig(gc: GeneralConfig) {
  reaction(
    () => gc.uol,
    action((newUOL: UnitOfLength, oldUOL: UnitOfLength) => {
      convertGeneralConfigUOL(gc, oldUOL);
    })
  );

  intercept(gc, "fieldImage", change => {
    const { app, assetManager } = getAppStores();

    if (app.gc === gc && assetManager.getAssetBySignature(change.newValue.signature) === undefined) {
      change.newValue = getDefaultBuiltInFieldImage().getSignatureAndOrigin();
    }

    return change;
  });
}

export interface ConfigSection {
  get format(): Format;
}

/**
 * Common configuration params for all formats
 * @param robotWidth Width of the robot in the unit of length
 * @param robotHeight Height of the robot in the unit of length
 * @param robotIsHolonomic Whether the robot is holonomic or not, or force the robot to be static
 * Force Static - The robot's heading aligns with the first end control of the current segment where the robot is located
 * Holonomic robot - The robot that can move in any direction without turning
 * @param showRobot Whether to show the robot on the field
 * @param uol Unit of length
 * @param pointDensity The spacing between two waypoints on the path
 * @param controlMagnetDistance The minimal distance for the dragging control to get magnetized to the Magnet Reference Line
 * @param fieldImage The field image using for the format
 * @param coordinateSystem The coordinate system used for the format
 */
export interface GeneralConfig extends ConfigSection {
  robotWidth: number;
  robotHeight: number;
  robotIsHolonomic: boolean | "force-static" | "force-holonomic";
  showRobot: boolean;
  uol: UnitOfLength;
  pointDensity: number;
  controlMagnetDistance: number;
  fieldImage: FieldImageSignatureAndOrigin<FieldImageOriginType>;
  coordinateSystem: string;
  /**
   * Get the react components as customized additional configuration UI for the format
   * The customized additional configuration UI will be render at the end of GeneralConfigPanelBody
   * @returns The customized additional configuration UI as react components
   */
  getAdditionalConfigUI(): React.ReactNode;
}

/** Common Path Configuration params for all formats
 * @param path The path to configure
 * @param lookaheadLimit The lookahead limit of the path, used for determining the lookahead of each points
 * @param speedLimit The configurable range of speed of the path
 * @param bentRateApplicableRange The configurable range of bent rate of the path
 * @param bentRateApplicationDirection The direction of the bent rate range on the speed canvas
 */
export interface PathConfig extends ConfigSection {
  path: Path;
  lookaheadLimit?: NumberRange;
  speedLimit: EditableNumberRange;
  bentRateApplicableRange: EditableNumberRange;
  bentRateApplicationDirection: BentRateApplicationDirection;
}
