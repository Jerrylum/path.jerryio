import { GeneralConfig } from "../app/GeneralConfigAccordion";
import { SpeedConfig } from "../app/SpeedControlAccordion";
import { Format } from "./format";
import { makeId } from "./shape";

export class PathDotJerryioFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  constructor() {
    this.uid = makeId(10);
  }

  getName(): string {
    return "path.jerryio v0.1.x (cm, rpm)";
  }

  init(): void {
    if (this.isInit) return;
    this.isInit = true;
  }

  buildGeneralConfig(): GeneralConfig {
    return new GeneralConfig();
  }

  buildSpeedConfig(): SpeedConfig {
    return new SpeedConfig();
  }
}
