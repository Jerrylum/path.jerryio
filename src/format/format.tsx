import { MainApp } from '../app/MainApp';
import { Path } from "../math/path";
import { GeneralConfig, OutputConfig, SpeedConfig } from "./config";

export interface Format {
  isInit: boolean;
  uid: string;

  getName(): string;

  init(): void;

  buildGeneralConfig(): GeneralConfig;

  buildSpeedConfig(): SpeedConfig;

  buildOutputConfig(): OutputConfig;

  exportPathFile(app: MainApp): string | undefined;
}
