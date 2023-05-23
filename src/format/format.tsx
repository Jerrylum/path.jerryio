import { Path } from "../math/path";
import { GeneralConfig, SpeedConfig } from "./config";

export interface Format {
    isInit: boolean;
    uid: string;
    
    getName(): string;
    
    init(): void;
    
    buildGeneralConfig(): GeneralConfig;
    
    buildSpeedConfig(): SpeedConfig;

    exportPathFile(paths: Path[], gc: GeneralConfig, sc: SpeedConfig): string | undefined;
}
