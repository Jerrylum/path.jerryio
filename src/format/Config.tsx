import { NumberRange } from "../app/RangeSlider";
import { UnitOfLength } from "../math/Unit";

export interface ConfigSection {
  getConfigPanel(): JSX.Element;
}

export interface GeneralConfig extends ConfigSection {
  robotWidth: number;
  robotHeight: number;
  showRobot: boolean;
  uol: UnitOfLength;
  pointDensity: number;
  controlMagnetDistance: number;
}

export interface SpeedConfig extends ConfigSection {
  speedLimit: NumberRange;
  applicationRange: NumberRange;
}

export interface OutputConfig extends ConfigSection {

}
