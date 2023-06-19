import { MainApp } from "../app/MainApp";
import { NumberRange } from "../app/RangeSlider";
import { UnitConverter, UnitOfLength } from "../types/Unit";

export function convertGeneralConfigUOL(gc: GeneralConfig, fromUOL: UnitOfLength) {
  const toUOL = gc.uol;
  const uc = new UnitConverter(fromUOL, toUOL);

  gc.robotWidth = uc.fromAtoB(gc.robotWidth);
  gc.robotHeight = uc.fromAtoB(gc.robotHeight);
  gc.pointDensity = uc.fromAtoB(gc.pointDensity);
  gc.controlMagnetDistance = uc.fromAtoB(gc.controlMagnetDistance);
}

export function convertPathConfigPointDensity(pc: PathConfig, fromDensity: number, toDensity: number) {
  const applyMaxLimit = Number(toDensity * 2).toUser();

  pc.bentRateApplicableRange.maxLimit.label = applyMaxLimit + "";
  pc.bentRateApplicableRange.maxLimit.value = applyMaxLimit;

  const ratio = toDensity / fromDensity;

  pc.bentRateApplicableRange.from = Number(pc.bentRateApplicableRange.from * ratio).toUser();
  pc.bentRateApplicableRange.to = Number(pc.bentRateApplicableRange.to * ratio).toUser();
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
  bentRateApplicableRange: NumberRange;
}
