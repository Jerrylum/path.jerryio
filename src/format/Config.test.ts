import { makeAutoObservable } from "mobx";

import { Expose, Exclude } from "class-transformer";
import { NumberRange } from "../component/RangeSlider";
import { MainApp } from "../core/MainApp";
import { Path } from "../core/Path";
import { UnitOfLength } from "../core/Unit";
import { GeneralConfig, PathConfig } from "./Config";
import { Format } from "./Format";

export class CustomGeneralConfig implements GeneralConfig {
  public custom: string = "custom";

  @Expose()
  robotWidth: number = 12;
  @Expose()
  robotHeight: number = 12;
  @Expose()
  robotIsHolonomic: boolean = false;
  @Expose()
  showRobot: boolean = true;
  @Expose()
  uol: UnitOfLength = UnitOfLength.Inch;
  @Expose()
  pointDensity: number = 2; // inches
  @Expose()
  controlMagnetDistance: number = 5 / 2.54;

  constructor() {
    makeAutoObservable(this);
  }

  get format(): Format {
    throw new Error("Method not implemented.");
  }

  getConfigPanel(app: MainApp): JSX.Element {
    throw new Error("Method not implemented.");
  }
}

export class CustomPathConfig implements PathConfig {
  @Expose()
  public custom: string = "custom";

  @Exclude()
  public path!: Path;

  @Expose()
  speedLimit: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 127, label: "127" },
    step: 1,
    from: 20,
    to: 100
  };
  @Expose()
  bentRateApplicableRange: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 4, label: "4" },
    step: 0.01,
    from: 1.4,
    to: 1.8
  };

  constructor() {
    makeAutoObservable(this);
  }

  get format(): Format {
    throw new Error("Method not implemented.");
  }

  getConfigPanel(app: MainApp): JSX.Element {
    throw new Error("Method not implemented.");
  }
}

test('Any', () => {});
