import { MainApp } from "../App";
import { GeneralConfig, SpeedConfig } from "./config";

export interface Format {
  isInit: boolean;
  uid: string;

  getName(): string;

  init(): void;

  buildGeneralConfig(): GeneralConfig;

  buildSpeedConfig(): SpeedConfig;

  exportPathFile(app: MainApp): string | undefined;
}
