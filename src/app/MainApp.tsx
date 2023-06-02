import { makeAutoObservable, computed } from "mobx"
import DOMPurify from 'dompurify';
import { GeneralConfig, OutputConfig } from "../format/Config";
import { InteractiveEntity } from "../math/Canvas";
import { Control, EndPointControl, Path, Vector } from "../math/Path";
import { addToArray, removeFromArray } from "./Util";
import { PathFileData, Format, getAllFormats } from "../format/Format";
import { PathDotJerryioFormatV0_1 } from "../format/PathDotJerryioFormatV0_1";
import { plainToInstance, instanceToPlain, plainToClassFromExist } from 'class-transformer';
import { UnitOfLength } from "../math/Unit";
import { Theme } from "@mui/material";
import { darkTheme, lightTheme } from "./Theme";

export interface AreaSelectionData {
  selectedBefore: string[];
}

// observable class
export class MainApp {
  public format: Format = new PathDotJerryioFormatV0_1();
  public usingUOL: UnitOfLength = UnitOfLength.Centimeter;
  public mountingFile: FileSystemFileHandle | null = null;

  public gc: GeneralConfig = this.format.buildGeneralConfig(); // a.k.a Configuration
  public oc: OutputConfig = this.format.buildOutputConfig(); // a.k.a Output

  public paths: Path[] = [];
  public selected: string[] = []; // ALGO: Not using Set because order matters
  public selectedBefore: string[] = []; // ALGO: For area selection
  public expanded: string[] = []; // ALGO: Order doesn't matter but anyway
  public magnet: Vector = new Vector(Infinity, Infinity);

  public theme: Theme = lightTheme;

  constructor() {
    makeAutoObservable(this);
  }

  @computed get isLightTheme(): boolean {
    return this.theme.palette.mode === "light";
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

  startAreaSelection(): void {
    this.selectedBefore = [...this.selected];
  }

  updateAreaSelection(from: Vector, to: Vector): void {
    const fixedFrom = new Vector(Math.min(from.x, to.x), Math.min(from.y, to.y));
    const fixedTo = new Vector(Math.max(from.x, to.x), Math.max(from.y, to.y));

    // ALGO: Select all controls that are within the area
    const highlighted = this.selectableControls
      .filter((control) => control.isWithinArea(fixedFrom, fixedTo))
      .map((cp) => cp.uid);

    // UX: select all highlighted controls except the ones that were selected before the area selection
    // outer-excluding-join
    const selected = [...this.selectedBefore, ...highlighted].filter((uid) => !(this.selectedBefore.includes(uid) && highlighted.includes(uid)));

    // remove duplicates
    this.selected = Array.from(new Set(selected));
  }

  @computed get selectableControls(): Control[] {
    return this.selectablePaths.flatMap((path) => path.controls.filter((control) => control.visible && !control.lock));
  }

  @computed get selectablePaths(): Path[] {
    return this.paths.filter((path) => path.visible && !path.lock);
  }

  @computed get selectedControl(): EndPointControl | Control | undefined {
    return this.paths.map(
      (path) => path.controls.find((control) => control.uid === this.selected[0])
    ).find((control) => control !== undefined);
  }

  @computed get selectedPath(): Path | undefined {
    if (this.selected.length === 0) return undefined;

    // ALGO: Return the first selected path if: some path is selected
    let rtn = this.paths.find((path) => this.isSelected(path.uid));
    // ALGO: Return the first selected control point's path if: some control point is selected, the path visible and not locked
    if (rtn === undefined) rtn = this.paths.find((path) => path.controls.some((control) => this.isSelected(control.uid)));

    return rtn;
  }

  private setPathFileData(format: Format, pfd: PathFileData): void {
    const purify = DOMPurify();

    this.expanded = [];
    for (const path of pfd.paths) {
      // SECURITY: Sanitize path names, beware of XSS attack from the path file
      const temp = purify.sanitize(path.name);
      path.name = temp === "" ? "Path" : temp;

      // ALGO: Link the first vector of each spline to the last vector of the previous spline
      for (let j = 1; j < path.splines.length; j++) {
        path.splines[j].first = path.splines[j - 1].last;
      }

      // UX: Expand all paths
      this.expanded.push(path.uid);
    }

    this.format = format;
    this.usingUOL = pfd.gc.uol;
    this.gc = pfd.gc;
    this.oc = pfd.oc;
    this.paths = pfd.paths;

    this.selected = [];
  }

  importPathFileData(data: Record<string, any>): void {
    const format = getAllFormats().find(f => f.getName() === data.format);
    if (format === undefined) throw new Error("Format not found.");
    format.init(); // ALGO: Suspend initFormat()

    if (typeof data.gc !== "object") throw new Error("Invalid data format: gc is not an object.");
    if (typeof data.oc !== "object") throw new Error("Invalid data format: oc is not an object.");

    const gc = plainToClassFromExist(format.buildGeneralConfig(), data.gc);
    const oc = plainToClassFromExist(format.buildOutputConfig(), data.oc);

    // check data.paths is an array
    if (!Array.isArray(data.paths)) throw new Error("Invalid data format: paths is not an array.");
    const paths = plainToInstance(Path, data.paths);

    for (const path of paths) {
      path.sc = plainToClassFromExist(format.buildSpeedConfig(), path.sc);
    }

    this.setPathFileData(format, {
      format: format.getName(),
      gc: gc,
      oc: oc,
      paths: paths
    });
  }

  exportPathFileData(): Record<string, any> {
    const data: PathFileData = {
      format: this.format.getName(),
      gc: this.gc,
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
        this.importPathFileData(JSON.parse(json));
        return;
      }
    }

    // Recover

    // Clone format
    const format = getAllFormats().find(f => f.getName() === this.format.getName()) as Format;
    format.init(); // ALGO: Suspend initFormat()
    const pfd = format.recoverPathFileData(fileContent);

    this.setPathFileData(format, pfd);
  }

  exportPathFile(): string | undefined {
    return this.format.exportPathFile(this);
  }
}
