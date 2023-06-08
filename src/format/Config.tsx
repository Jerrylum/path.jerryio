import { MainApp } from "../app/MainApp";
import { NumberRange } from "../app/RangeSlider";
import { UnitConverter, UnitOfLength } from "../math/Unit";

export function convertGeneralConfigUOL(gc: GeneralConfig, fromUOL: UnitOfLength) {
  const toUOL = gc.uol;
  const uc = new UnitConverter(fromUOL, toUOL);

  gc.robotWidth = uc.fromAtoB(gc.robotWidth);
  gc.robotHeight = uc.fromAtoB(gc.robotHeight); 
  gc.pointDensity = uc.fromAtoB(gc.pointDensity);
  gc.controlMagnetDistance = uc.fromAtoB(gc.controlMagnetDistance);
}

export function convertPathConfigPointDensity(pc: PathConfig, fromDensity: number, toDensity: number) {
  const applyMaxLimit = parseFloat((toDensity * 2).toFixed(3));

  pc.applicationRange.maxLimit.label = applyMaxLimit + "";
  pc.applicationRange.maxLimit.value = applyMaxLimit;

  const ratio = toDensity / fromDensity;

  pc.applicationRange.from *= ratio;
  pc.applicationRange.from = parseFloat(pc.applicationRange.from.toFixed(3));
  pc.applicationRange.to *= ratio;
  pc.applicationRange.to = parseFloat(pc.applicationRange.to.toFixed(3));
}

export interface ConfigSection {
  getConfigPanel(app: MainApp): JSX.Element;
}

export interface GeneralConfig extends ConfigSection {
  robotWidth: number;
  robotHeight: number;
  showRobot: boolean;
  uol: UnitOfLength;
  pointDensity: number;
  controlMagnetDistance: number;
}

export interface PathConfig extends ConfigSection {
  speedLimit: NumberRange;
  applicationRange: NumberRange;
}
