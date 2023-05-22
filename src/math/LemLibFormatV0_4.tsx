import { GeneralConfig, UnitOfLength } from "../app/GeneralConfigAccordion";
import { SpeedConfig } from "../app/SpeedControlAccordion";
import { Format } from "./format";
import { Path } from "./path";
import { makeId } from "./shape";

export class LemLibFormatV0_4 implements Format {
  isInit: boolean = false;
  uid: string;

  constructor() {
    this.uid = makeId(10);
  }

  getName(): string {
    return "LemLib v0.4.x (inch, byte-voltage)";
  }

  init(): void {
    if (this.isInit) return;
    this.isInit = true;
  }

  buildGeneralConfig(): GeneralConfig {
    const rtn = new GeneralConfig();
    rtn.robotWidth = 12;
    rtn.robotHeight = 12;
    rtn.uol = UnitOfLength.Inch;
    rtn.controlMagnetDistance = 5 / 2.54;
    return rtn;
  }

  buildSpeedConfig(): SpeedConfig {
    const rtn = new SpeedConfig();
    rtn.speedLimit = {
      minLimit: { value: 0, label: "0" },
      maxLimit: { value: 127, label: "127" },
      step: 1,
      from: 20,
      to: 100,
    };
    rtn.applicationRange = {
      minLimit: { value: 0, label: "0" },
      maxLimit: { value: 1.6, label: "1.6" },
      step: 0.01,
      from: 0,
      to: 0.4,
    };
    rtn.transitionRange = {
      minLimit: { value: 0, label: "0" },
      maxLimit: { value: 1, label: "1" },
      step: 0.01,
      from: 0,
      to: 0.95,
    };
    return rtn;
  }

  exportPathFile(paths: Path[], gc: GeneralConfig, sc: SpeedConfig): string {
    return "";
  }
}
