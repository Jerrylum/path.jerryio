import { MainApp } from '../app/MainApp';
import { makeId } from "../app/Util";
import { UnitConverter, UnitOfLength } from "../math/unit";
import { GeneralConfig, SpeedConfig } from "./config";
import { Format } from "./format";

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

  exportPathFile(app: MainApp): string | undefined {
    let rtn = "";

    const uc = new UnitConverter(app.gc.uol, UnitOfLength.Centimeter);

    for (const path of app.paths) {
      rtn += `#PATH-KNOTS-START ${path.name}\n`;

      const knots = path.calculateKnots(app.gc, app.sc);
      for (const knot of knots) {
        const x = uc.fromAtoB(knot.x);
        const y = uc.fromAtoB(knot.y);
        if (knot.heading !== undefined)
          rtn += `${x},${y},${knot.speed.toFixed(3)},${knot.heading}\n`;
        else
          rtn += `${x},${y},${knot.speed.toFixed(3)}\n`;
      }

      rtn += `#PATH-KNOTS-END\n`;
      rtn += `#PATH-EDITOR ${path.name}\n`; // TODO
    }
    return rtn;
  }
}
