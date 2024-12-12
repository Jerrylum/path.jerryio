import { makeAutoObservable } from "mobx";
import { MainApp, getAppStores } from "@core/MainApp";
import { makeId } from "@core/Util";
import { Path, Segment, Vector } from "@core/Path";
import { UnitOfLength, UnitConverter, Quantity } from "@core/Unit";
import { GeneralConfig, convertFormat } from "../Config";
import { Format, importPDJDataFromTextFile } from "../Format";
import { PointCalculationResult, getPathPoints, getDiscretePoints, fromDegreeToRadian } from "@core/Calculation";
import { euclideanRotation } from "@core/Coordinate";
import { UserInterface } from "@core/Layout";
import { GeneralConfigImpl } from "./GeneralConfig";
import { PathConfigImpl } from "./PathConfig";

// observable class
export class LemLibOdomGeneratorFormatV0_4 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new LemLibOdomGeneratorFormatV0_4();
  }

  getName(): string {
    return "LemLib Odom Code Gen v0.4";
  }

  getDescription(): string {
    return "Generates a sequence of LemLib .moveTo function calls.";
  }

  register(app: MainApp, ui: UserInterface): void {
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
    const gc = app.gc as GeneralConfigImpl;

    const path = app.interestedPath();
    if (path === undefined) throw new Error("No path to export");
    if (path.segments.length === 0) throw new Error("No segment to export");

    const uc = new UnitConverter(this.gc.uol, UnitOfLength.Inch);
    const points = getDiscretePoints(path);

    if (points.length > 0) {
      const start = points[0];
      let heading = 0;

      if (start.heading !== undefined && gc.relativeCoords) {
        heading = fromDegreeToRadian(start.heading);
      }

      // ALGO: Offsets to convert the absolute coordinates to the relative coordinates LemLib uses
      const offsets = gc.relativeCoords ? new Vector(start.x, start.y) : new Vector(0, 0);
      for (const point of points) {
        // ALGO: Only coordinate points are supported in LemLibOdom format
        const relative = euclideanRotation(heading, point.subtract(offsets));
        rtn += `${gc.chassisName}.moveTo(${uc.fromAtoB(relative.x).toUser()}, ${uc.fromAtoB(relative.y).toUser()}, ${
          gc.movementTimeout
        });\n`;
      }
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
