import { makeAutoObservable } from "mobx";
import { MainApp, getAppStores } from "@core/MainApp";
import { makeId } from "@core/Util";
import { Quantity, UnitConverter, UnitOfLength } from "@core/Unit";
import { GeneralConfig, convertFormat } from "../Config";
import { Format, importPDJDataFromTextFile } from "../Format";
import { PointCalculationResult, getPathPoints } from "@core/Calculation";
import { Path, Segment } from "@core/Path";
import { isCoordinateWithHeading } from "@core/Coordinate";
import { GeneralConfigImpl } from "./GeneralConfig";
import { PathConfigImpl, PathConfigPanel } from "./PathConfig";
import { UserInterface } from "@core/Layout";

// observable class
export class PathDotJerryioFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  private readonly disposers: (() => void)[] = [];

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new PathDotJerryioFormatV0_1();
  }

  getName(): string {
    return "path.jerryio v0.1";
  }

  getDescription(): string {
    return "The default and official format for path planning purposes and custom library. Output is in cm, rpm.";
  }

  register(app: MainApp, ui: UserInterface): void {
    if (this.isInit) return;
    this.isInit = true;

    this.disposers.push(ui.registerPanel(PathConfigPanel).disposer);
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
    return getPathPoints(path, new Quantity(this.gc.pointDensity, this.gc.uol));
  }

  convertFromFormat(oldFormat: Format, oldPaths: Path[]): Path[] {
    return convertFormat(this, oldFormat, oldPaths);
  }

  importPathsFromFile(buffer: ArrayBuffer): Path[] {
    throw new Error("Unable to import paths from this format, try other formats?");
  }

  importPDJDataFromFile(buffer: ArrayBuffer): Record<string, any> | undefined {
    return importPDJDataFromTextFile(buffer);
  }

  exportFile(): ArrayBuffer {
    const { app } = getAppStores();

    let fileContent = "";

    const uc = new UnitConverter(app.gc.uol, UnitOfLength.Centimeter);
    const density = new Quantity(app.gc.pointDensity, app.gc.uol);

    for (const path of app.paths) {
      fileContent += `#PATH-POINTS-START ${path.name}\n`;

      const points = getPathPoints(path, density).points;

      for (const point of points) {
        const x = uc.fromAtoB(point.x).toUser();
        const y = uc.fromAtoB(point.y).toUser();
        if (isCoordinateWithHeading(point)) fileContent += `${x},${y},${point.speed.toUser()},${point.heading}\n`;
        else fileContent += `${x},${y},${point.speed.toUser()}\n`;
      }
    }

    fileContent += "#PATH.JERRYIO-DATA " + JSON.stringify(app.exportPDJData());

    return new TextEncoder().encode(fileContent);
  }
}
