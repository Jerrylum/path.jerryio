import { MainApp } from "../app/MainApp";
import { NumberRange } from "../app/RangeSlider";
import { UnitOfLength } from "../math/Unit";

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
