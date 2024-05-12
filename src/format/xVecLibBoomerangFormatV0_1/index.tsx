import { makeAutoObservable } from "mobx";
import { MainApp, getAppStores } from "@core/MainApp";
import { makeId } from "@core/Util";
import { Path, Segment } from "@core/Path";
import { UnitOfLength, UnitConverter, Quantity } from "@core/Unit";
import { GeneralConfig, convertFormat } from "../Config";
import { Format, importPDJDataFromTextFile } from "../Format";
import { PointCalculationResult, getPathPoints } from "@core/Calculation";
import { GeneralConfigImpl } from "./GeneralConfig";
import { PathConfigImpl } from "./PathConfig";

// observable class
export class xVecLibBoomerangFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new xVecLibBoomerangFormatV0_1();
  }

  getName(): string {
    return "xVecLib Boomerang v0.1.0 (inch)";
  }
  getDescription(): string {
    return "Generates a sequence of xVecLib .moveToBoom function calls.";
  }
  register(app: MainApp): void {
    if (this.isInit) return;
    this.isInit = true;
  }

  unregister(): void {}

  getGeneralConfig(): GeneralConfig {
    return this.gc;
  }

  createPath(...segments: Segment[]): Path {
    return new Path(new PathConfigImpl(this), ...segments);
  }

  getPathPoints(path: Path): PointCalculationResult {
    const result = getPathPoints(path, new Quantity(this.gc.pointDensity, this.gc.uol));
    return result;
  }

  convertFromFormat(oldFormat: Format, oldPaths: Path[]): Path[] {
    return convertFormat(this, oldFormat, oldPaths);
  }

  importPathsFromFile(buffer: ArrayBuffer): Path[] {
    throw new Error("Unable to import paths from this format, try other formats?");
  }

  exportCode(): string {
    const { app } = getAppStores();
    let rtn = "";
    let arr = [];

    const gc = app.gc as GeneralConfigImpl;

    const path = app.interestedPath();
    if (path === undefined) throw new Error("No path to export");
    if (path.segments.length === 0) throw new Error("No segment to export");

    const uc = new UnitConverter(this.gc.uol, UnitOfLength.Inch);
    const points = path.segments;
    if (points.length > 0) {
      for (const point of points) {
        if (path.segments.indexOf(point) === 0) {
          rtn += `robo.set(${Math.round(point.first.x)}, ${Math.round(point.first.y)});\n`;

          rtn += `imu.set_rotation(${
            point.first.heading / 180 > 0 ? point.first.heading - 180 : point.first.heading + 180
          };\n`;
          rtn += `ou.printCoords();\n`;
          // point.first.heading = -Math.atan2(point.first.x - point.last.x, point.first.y - point.last.y)* (180 / 3.14159265358979323846);
        }
        let pnt = 0;
        let last = path.controls.at(path.controls.length - 1);
        let dis;
        if (last != null) {
          dis = path.controls.at(0)?.distance(last);
          if (point.isCubic() && dis != null) {
            let poin =
              point.controls[1].distance(point.first) > point.controls[2].distance(point.last)
                ? point.controls[1]
                : point.controls[2];
            if (point.first.heading === 0) {
              point.first.heading =
                Math.atan2(point.first.x - poin.x, point.first.y - poin.y) * (180 / 3.14159265358979323846);
            }
            if (point.last.heading === 0) {
              point.last.heading =
                Math.atan2(point.last.x - poin.x, point.last.y - poin.y) * (180 / 3.14159265358979323846);
            }
            if (path.segments.indexOf(point) === path.segments.length - 1) {
              pnt = -(point.first.x - poin.x) / (dis * Math.sin(point.first.heading));
            } else {
              pnt = -(point.last.x - poin.x) / (dis * Math.sin(point.last.heading));
            }
          }
        }
        arr.push([
          gc.chassisName,
          uc.fromAtoB(point.last.x).toUser(),
          uc.fromAtoB(point.last.y).toUser(),
          point.last.heading,
          pnt
        ]);
      }
    }
    for (const s of arr) {
      rtn += `${s[0]}.moveToBoom( ${s[1]}, ${s[2]}, ${s[3]}, ${s[4]},${gc.movementTimeout / 1000});\n`;
    }
    return rtn;
  }

  importPDJDataFromFile(buffer: ArrayBuffer): Record<string, any> | undefined {
    return importPDJDataFromTextFile(buffer);
  }

  exportFile(): ArrayBuffer {
    const { app } = getAppStores();

    let fileContent = this.exportCode();

    fileContent += "\n";

    fileContent += "#PATH.JERRYIO-DATA " + JSON.stringify(app.exportPDJData());

    return new TextEncoder().encode(fileContent);
  }
}
