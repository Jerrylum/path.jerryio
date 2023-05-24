import { MainApp } from '../app/MainApp';
import { Path } from "../math/path";
import { LemLibFormatV0_4 } from './LemLibFormatV0_4';
import { PathDotJerryioFormatV0_1 } from './PathDotJerryioFormatV0_1';
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

export interface AppData {
  format: string;
  gc: GeneralConfig;
  sc: SpeedConfig;
  oc: OutputConfig;
  paths: Path[];
}

export function getAllFormats(): Format[] {
  return [
    new LemLibFormatV0_4(),
    new PathDotJerryioFormatV0_1()
  ];
}
