import { reaction, action, intercept } from "mobx";
import { UnitConverter, UnitOfLength } from "../core/Unit";
import { Format } from "./Format";
import { BentRateApplicationDirection, Path } from "../core/Path";
import { FieldImageOriginType, FieldImageSignatureAndOrigin, getDefaultBuiltInFieldImage } from "../core/Asset";
import { EditableNumberRange, NumberRange } from "../core/Util";
import { getAppStores } from "../core/MainApp";

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
  getConfigPanel(): JSX.Element;
}

export interface GeneralConfig extends ConfigSection {
  robotWidth: number;
  robotHeight: number;
  robotIsHolonomic: boolean;
  showRobot: boolean;
  uol: UnitOfLength;
  pointDensity: number;
  controlMagnetDistance: number;
  fieldImage: FieldImageSignatureAndOrigin<FieldImageOriginType>;
}

export interface PathConfig extends ConfigSection {
  path: Path;
  lookaheadLimit?: NumberRange;
  speedLimit: EditableNumberRange;
  bentRateApplicableRange: EditableNumberRange;
  bentRateApplicationDirection: BentRateApplicationDirection;
}
