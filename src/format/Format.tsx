import { MainApp } from '../app/MainApp';
import { Path } from "../math/Path";
import { LemLibFormatV0_4 } from './LemLibFormatV0_4';
import { PathDotJerryioFormatV0_1 } from './PathDotJerryioFormatV0_1';
import { GeneralConfig, PathConfig } from "./Config";

export interface Format {
  isInit: boolean;
  uid: string;

  getName(): string;

  init(): void;

  createNewInstance(): Format;

  getGeneralConfig(): GeneralConfig;

  buildPathConfig(): PathConfig;

  recoverPathFileData(fileContent: string): PathFileData;

  exportPathFile(app: MainApp): string; // return file content
}

export interface PathFileData {
  gc: GeneralConfig;
  paths: Path[];
}

export function getAllFormats(): Format[] {
  return [
    new LemLibFormatV0_4(),
    new PathDotJerryioFormatV0_1()
  ];
}
