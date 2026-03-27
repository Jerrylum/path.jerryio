import { makeAutoObservable } from "mobx";
import { BentRateApplicationDirection, Path } from "@core/Path";
import { EditableNumberRange } from "@core/Util";
import { Exclude } from "class-transformer";
import { Format } from "../Format";
import { PathConfig } from "../Config";

// observable class
export class PathConfigImpl implements PathConfig {
  @Exclude()
  speedLimit: EditableNumberRange = {
    minLimit: { value: 0, label: "" },
    maxLimit: { value: 0, label: "" },
    step: 0,
    from: 0,
    to: 0
  };
  @Exclude()
  bentRateApplicableRange: EditableNumberRange = {
    minLimit: { value: 0, label: "" },
    maxLimit: { value: 0, label: "" },
    step: 0,
    from: 0,
    to: 0
  };
  @Exclude()
  bentRateApplicationDirection = BentRateApplicationDirection.HighToLow;

  @Exclude()
  readonly format: Format;

  @Exclude()
  public path!: Path;

  constructor(format: Format) {
    this.format = format;
    makeAutoObservable(this);
  }
}
