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

  private readonly disposers: (() => void)[] = [];

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new xVecLibBoomerangFormatV0_1();
  }

  getName(): string {
    return "xVecLib Boomerang v1.0.0 (inch)";
  }

    getDescription(): string {
    return "Generates a sequence of xVecLib .moveToBoom function calls.";
  }

  register(app: MainApp): void {
    if (this.isInit) return;
    this.isInit = true;
    this.disposers.push();
  }

  unregister(): void {
    this.disposers.forEach(disposer => disposer());
  }

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
    const segments = path.segments;
    if (segments.length > 0) {
      let tmpp = segments[0].first.heading > 180 ? segments[0].first.heading - 360 : segments[0].first.heading;

      rtn += `${gc.chassisName}.setPos(${Math.round(segments[0].first.x)}, ${Math.round(
        segments[0].first.y
      )},${tmpp});\n`;
      rtn += `${gc.chassisName}.printCoords();\n`;

      for (const seg of segments) {
        let lead = 0;
        let last = path.controls.at(path.controls.length - 1);
        let first = path.controls.at(0);
        let dis;
        if (last != null && first != null) {
          dis = path.controls.at(0)?.distance(last);
          if (seg.isCubic() && dis != null) {
            let closestContol =
              seg.controls[1].distance(seg.first) > seg.controls[2].distance(seg.last)
                ? seg.controls[1]
                : seg.controls[2];
            if (seg.first === path.controls.at(0)) {
              seg.first.heading =
                180 + Math.atan2(seg.first.x - closestContol.x, seg.first.y - closestContol.y) * (180 / Math.PI);
            }
            if (
              seg.controls[1] === closestContol &&
              (seg.first.heading === 0 || seg.first.heading === 180 || seg.last.heading === 0 || seg.last.heading === 0)
            ) {
              seg.controls[2].setXY(seg.last.x, seg.last.y);
            } else if (
              seg.first.heading === 0 ||
              seg.first.heading === 180 ||
              seg.last.heading === 0 ||
              seg.last.heading === 0
            ) {
              seg.controls[1].setXY(seg.first.x, seg.first.y);
            }
            if (seg.first.heading === 0 || seg.first.heading === 180) {
              seg.first.heading =
                Math.atan2(seg.first.x - closestContol.x, seg.first.y - closestContol.y) * (180 / Math.PI);
            }
            if (seg.last.heading === 0 || seg.last.heading === 180) {
              seg.last.heading =
                Math.atan2(seg.last.x - closestContol.x, seg.last.y - closestContol.y) * (180 / Math.PI);
            }
            let numIterations = 0;
            if (path.segments.indexOf(seg) === path.segments.length - 1) {
              lead = (seg.first.x - closestContol.x) / (dis * Math.sin(seg.first.heading));

              while (Math.abs(lead) > 1) {
                numIterations++;
                if (lead > 3) {
                  seg.first.heading += 0.5;
                } else {
                  seg.first.heading -= 0.5;
                }
                lead = (seg.first.x - closestContol.x) / (dis * Math.sin(seg.first.heading));
                if (numIterations > gc.maxIterations) {
                  break;
                }
              }
            } else {
              lead = (seg.last.x - closestContol.x) / (dis * Math.sin(seg.last.heading));
              while (Math.abs(lead) > 1) {
                numIterations++;
                if (lead > 1) {
                  seg.last.heading += 0.5;
                } else {
                  seg.last.heading -= 0.5;
                }
                lead = (seg.last.x - closestContol.x) / (dis * Math.sin(seg.last.heading));
                if (numIterations > gc.maxIterations) {
                  break;
                }
              }
            }
            if (lead > 1 && !gc.badLead) {
              lead = 1;
            } else if (lead < -1 && !gc.badLead) {
              lead = -1;
            }
          }
        }
        let tmpp = seg.last.heading > 180 ? seg.last.heading - 360 : seg.last.heading;

        arr.push([gc.chassisName, uc.fromAtoB(seg.last.x).toUser(), uc.fromAtoB(seg.last.y).toUser(), tmpp, lead]);
      }
    }
    for (const s of arr) {
      rtn += `${s[0]}.moveToBoom( ${s[1]}, ${s[2]}, ${s[3]}, ${s[4]},${gc.movementTimeout});\n`;
    }
    return rtn;
  }

  importPDJDataFromFile(buffer: ArrayBuffer): Record<string, any> | undefined {
    return importPDJDataFromTextFile(buffer);
  }

  exportFile(): ArrayBufferView<ArrayBufferLike> {
    const { app } = getAppStores();

    let fileContent = this.exportCode();

    fileContent += "\n";

    fileContent += "#PATH.JERRYIO-DATA " + JSON.stringify(app.exportPDJData());

    return new TextEncoder().encode(fileContent);
  }
}
