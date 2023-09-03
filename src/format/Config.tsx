// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { NumberRange } from "../component/RangeSlider";
import { UnitConverter, UnitOfLength } from "../core/Unit";
import { Format } from "./Format";
import { Path } from "../core/Path";
import { FieldImageOriginType, FieldImageSignatureAndOrigin } from "../core/Asset";

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
  speedLimit: NumberRange;
  bentRateApplicableRange: NumberRange;
}
