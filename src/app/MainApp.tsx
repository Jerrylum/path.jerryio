import { makeAutoObservable } from "mobx"
import DOMPurify from 'dompurify';
import { GeneralConfig, SpeedConfig, OutputConfig } from "../format/Config";
import { InteractiveEntity } from "../math/Canvas";
import { Path, Vertex } from "../math/Path";
import { addToArray, removeFromArray } from "./Util";
import { PathFileData, Format, getAllFormats } from "../format/Format";
import { PathDotJerryioFormatV0_1 } from "../format/PathDotJerryioFormatV0_1";
import { plainToInstance, instanceToPlain, plainToClassFromExist } from 'class-transformer';
import { UnitOfLength } from "../math/Unit";


// observable class
export class MainApp {
  public format: Format = new PathDotJerryioFormatV0_1();
  public usingUOL: UnitOfLength = UnitOfLength.Centimeter;

  public gc: GeneralConfig = this.format.buildGeneralConfig(); // a.k.a Configuration
  public sc: SpeedConfig = this.format.buildSpeedConfig(); // a.k.a Speed Control
  public oc: OutputConfig = this.format.buildOutputConfig(); // a.k.a Output

  public paths: Path[] = [];
  public selected: string[] = [];
  public expanded: string[] = [];
  public magnet: Vertex = new Vertex(Infinity, Infinity);

  constructor() {
    makeAutoObservable(this);
  }

  isSelected(x: InteractiveEntity | string): boolean {
    return typeof x === "string" ? this.selected.includes(x) : this.selected.includes(x.uid);
  }

  addSelected(x: InteractiveEntity | string): boolean {
    return addToArray(this.selected, typeof x === "string" ? x : x.uid);
  }

  removeSelected(x: InteractiveEntity | string): boolean {
    return removeFromArray(this.selected, typeof x === "string" ? x : x.uid);
  }

  isExpanded(x: InteractiveEntity | string): boolean {
    return typeof x === "string" ? this.expanded.includes(x) : this.expanded.includes(x.uid);
  }

  addExpanded(x: InteractiveEntity | string): boolean {
    return addToArray(this.expanded, typeof x === "string" ? x : x.uid);
  }

  removeExpanded(x: InteractiveEntity | string): boolean {
    return removeFromArray(this.expanded, typeof x === "string" ? x : x.uid);
  }

  importPathFileData(data: Record<string, any>): void {
    const format = getAllFormats().find(f => f.getName() === data.format);
    if (format === undefined) throw new Error("Format not found.");
    format.init(); // ALGO: Suspend initFormat()

    if (typeof data.gc !== "object") throw new Error("Invalid data format: gc is not an object.");
    if (typeof data.sc !== "object") throw new Error("Invalid data format: sc is not an object.");
    if (typeof data.oc !== "object") throw new Error("Invalid data format: oc is not an object.");

    const gc = plainToClassFromExist(format.buildGeneralConfig(), data.gc);
    const sc = plainToClassFromExist(format.buildSpeedConfig(), data.sc);
    const oc = plainToClassFromExist(format.buildOutputConfig(), data.oc);

    // check data.paths is an array
    if (!Array.isArray(data.paths)) throw new Error("Invalid data format: paths is not an array.");
    const paths = plainToInstance(Path, data.paths);

    const purify = DOMPurify();

    // SECURITY: sanitize path names, beware of XSS attack from the path file
    for (const path of paths) {
      const temp = purify.sanitize(path.name);
      path.name = temp === "" ? "Path" : temp;
    }

    this.format = format;
    this.usingUOL = gc.uol;
    this.gc = gc;
    this.sc = sc;
    this.oc = oc;
    this.paths = paths;
  }

  exportPathFileData(): Record<string, any> {
    const data: PathFileData = {
      format: this.format.getName(),
      gc: this.gc,
      sc: this.sc,
      oc: this.oc,
      paths: this.paths
    };

    return instanceToPlain(data);
  }

  importPathFile(fileContent: string): void {
    // ALGO: This function throws error
    // ALGO: Just find the first line that starts with "#PATH.JERRYIO-DATA"
    // ALGO: Throw error if not found
    const lines = fileContent.split("\n");
    for (const line of lines) {
      if (line.startsWith("#PATH.JERRYIO-DATA")) {
        const json = line.substring("#PATH.JERRYIO-DATA".length).trim();
        const pfd = JSON.parse(json) as PathFileData;
        this.importPathFileData(pfd);
        return;
      }
    }

    // Recover

    // Clone format
    const format = getAllFormats().find(f => f.getName() === this.format.getName()) as Format;
    format.init(); // ALGO: Suspend initFormat()
    const pfd = format.recoverPathFileData(fileContent);

    this.format = format;
    this.usingUOL = pfd.gc.uol;
    this.gc = pfd.gc;
    this.sc = pfd.sc;
    this.oc = pfd.oc;
    this.paths = pfd.paths;
  }

  exportPathFile(): string | undefined {
    return this.format.exportPathFile(this);
  }
}
