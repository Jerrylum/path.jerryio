import { GeneralConfig } from "../app/GeneralConfigAccordion";
import { SpeedConfig } from "../app/SpeedControlAccordion";
import { Path } from "./path";

export interface Format {
    isInit: boolean;
    uid: string;
    
    getName(): string;
    
    init(): void;
    
    buildGeneralConfig(): GeneralConfig;
    
    buildSpeedConfig(): SpeedConfig;

    exportPathFile(paths: Path[], gc: GeneralConfig, sc: SpeedConfig): string;
}
