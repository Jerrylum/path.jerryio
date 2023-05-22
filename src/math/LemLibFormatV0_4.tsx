import { GeneralConfig, UnitOfLength } from "../app/GeneralConfigAccordion";
import { SpeedConfig } from "../app/SpeedControlAccordion";
import { Format } from "./format";
import { Path, Vertex } from "./path";
import { makeId } from "./shape";

export class LemLibFormatV0_4 implements Format {
  isInit: boolean = false;
  uid: string;

  constructor() {
    this.uid = makeId(10);
  }

  getName(): string {
    return "LemLib v0.4.x (inch, byte-voltage)";
  }

  init(): void {
    if (this.isInit) return;
    this.isInit = true;
  }

  buildGeneralConfig(): GeneralConfig {
    const rtn = new GeneralConfig();
    rtn.robotWidth = 12;
    rtn.robotHeight = 12;
    rtn.uol = UnitOfLength.Inch;
    rtn.controlMagnetDistance = 5 / 2.54;
    return rtn;
  }

  buildSpeedConfig(): SpeedConfig {
    const rtn = new SpeedConfig();
    rtn.speedLimit = {
      minLimit: { value: 0, label: "0" },
      maxLimit: { value: 127, label: "127" },
      step: 1,
      from: 20,
      to: 100,
    };
    rtn.applicationRange = {
      minLimit: { value: 0, label: "0" },
      maxLimit: { value: 1.6, label: "1.6" },
      step: 0.01,
      from: 0,
      to: 0.4,
    };
    rtn.transitionRange = {
      minLimit: { value: 0, label: "0" },
      maxLimit: { value: 1, label: "1" },
      step: 0.01,
      from: 0,
      to: 0.95,
    };
    return rtn;
  }

  exportPathFile(paths: Path[], gc: GeneralConfig, sc: SpeedConfig): string | undefined {
    let rtn = "";

    if (paths.length === 0) return;

    const path = paths[0]; // TODO use selected path
    if (path.splines.length === 0) return;

    const knots = path.calculateKnots(gc, sc);
    for (const knot of knots) {
      // ALGO: heading is not supported
      rtn += `${knot.x.toFixed(3)}, ${knot.y.toFixed(3)}, ${knot.speed.toFixed(3)}\n`;
    }

    rtn += `endData\n`;
    rtn += `0.1\n`; // Not supported
    rtn += `${sc.speedLimit.to}\n`;
    rtn += `0.1\n`; // Not supported

    for (const spline of path.splines) {
      if (spline.controls.length === 4) {
        rtn += `${spline.controls[0].x.toFixed(3)}, ${spline.controls[0].y.toFixed(3)}, `;
        rtn += `${spline.controls[1].x.toFixed(3)}, ${spline.controls[1].y.toFixed(3)}, `;
        rtn += `${spline.controls[2].x.toFixed(3)}, ${spline.controls[2].y.toFixed(3)}, `;
        rtn += `${spline.controls[3].x.toFixed(3)}, ${spline.controls[3].y.toFixed(3)}\n`;
      } else if (spline.controls.length === 2) {
        const center = spline.controls[0].add(spline.controls[1]).divide(new Vertex(2, 2));
        rtn += `${spline.controls[0].x.toFixed(3)}, ${spline.controls[0].y.toFixed(3)}, `;
        rtn += `${center.x.toFixed(3)}, ${center.y.toFixed(3)}, `;
        rtn += `${center.x.toFixed(3)}, ${center.y.toFixed(3)}, `;
        rtn += `${spline.controls[1].x.toFixed(3)}, ${spline.controls[1].y.toFixed(3)}\n`;
      }
    }
    return rtn;
  }
}
