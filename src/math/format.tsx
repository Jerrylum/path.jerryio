import { GeneralConfig } from "../app/GeneralConfigAccordion";
import { SpeedConfig } from "../app/SpeedControlAccordion";

export interface Format {
    isInit: boolean;

    getName(): string;

    init(): void;

    buildGeneralConfig(): GeneralConfig;

    buildSpeedConfig(): SpeedConfig;
}
