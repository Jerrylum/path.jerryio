import { GeneralConfig } from "../app/GeneralConfigAccordion";
import { SpeedConfig } from "../app/SpeedControlAccordion";
import { Format } from "./format";

export class PathDotJerryioFormatV0_1 implements Format {
    isInit: boolean = false;

    constructor() {

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
