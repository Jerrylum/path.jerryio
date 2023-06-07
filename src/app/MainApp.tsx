import { makeAutoObservable, computed, runInAction, reaction, action } from "mobx"
import DOMPurify from 'dompurify';
import { GeneralConfig } from "../format/Config";
import { InteractiveEntity } from "../math/Canvas";
import { Control, EndPointControl, Path, Vector } from "../math/Path";
import { addToArray, clamp, removeFromArray } from "./Util";
import { PathFileData, Format, getAllFormats } from "../format/Format";
import { PathDotJerryioFormatV0_1 } from "../format/PathDotJerryioFormatV0_1";
import { plainToInstance, instanceToPlain, plainToClassFromExist } from 'class-transformer';
import { UnitConverter, UnitOfLength } from "../math/Unit";
import { Theme } from "@mui/material";
import { darkTheme, lightTheme } from "./Theme";
import { CancellableCommand } from "../math/Command";

// observable class
export class MainApp {
  public format: Format = new PathDotJerryioFormatV0_1();
  private usingUOL: UnitOfLength = UnitOfLength.Centimeter;
  public mountingFile: FileSystemFileHandle | null = null; // This is intended to be modified outside the class

  public gc: GeneralConfig = this.format.buildGeneralConfig(); // a.k.a Configuration

  public paths: Path[] = [];
  private selected: string[] = []; // ALGO: Not using Set because order matters
  private selectedBefore: string[] = []; // ALGO: For area selection
  private lastInterestedPath: Path | undefined = undefined; // ALGO: For adding controls
  private expanded: string[] = []; // ALGO: Order doesn't matter but anyway
  public magnet: Vector = new Vector(Infinity, Infinity);

  private history: CancellableCommand[] = [];
  private redoHistory: CancellableCommand[] = [];

  public view = {
    showSpeedCanvas: true,
    showRightPanel: true
  }

  private fieldDisplay = {
    offset: new Vector(0, 0), // Clamp user input only
    scale: 1, // 1 = 100%, [1..3]
  }

  public theme: Theme = lightTheme;


  constructor() {
    makeAutoObservable(this);

    reaction(() => this.format, action((newFormat: Format, oldFormat: Format) => {
      if (newFormat.isInit) return;

      // ALGO: this reaction should only be triggered when the format is changed by the user

      newFormat.init();

      const robotWidth = this.gc.robotWidth;
      const robotHeight = this.gc.robotHeight;

      this.gc = this.format.buildGeneralConfig();
      this.gc.pointDensity = new UnitConverter(this.usingUOL, this.gc.uol, 5).fromBtoA(this.gc.pointDensity); // UX: Keep some values
      this.gc.robotWidth = robotWidth;
      this.gc.robotHeight = robotHeight;

      for (const path of this.paths) {
        path.pc = this.format.buildPathConfig();
      }

      this.resetUserControl();
    }));

    reaction(() => this.gc.uol, action((newUOL: UnitOfLength, oldUOL: UnitOfLength) => {
      if (this.usingUOL === newUOL) return;

      const uc = new UnitConverter(oldUOL, newUOL);

      this.gc.pointDensity = uc.fromAtoB(this.gc.pointDensity);
      this.gc.controlMagnetDistance = uc.fromAtoB(this.gc.controlMagnetDistance);
      this.gc.robotWidth = uc.fromAtoB(this.gc.robotWidth);
      this.gc.robotHeight = uc.fromAtoB(this.gc.robotHeight);

      for (const path of this.paths) {
        for (const control of path.controls) {
          control.x = uc.fromAtoB(control.x);
          control.y = uc.fromAtoB(control.y);
        }
      }

      this.usingUOL = newUOL;
    }));

    reaction(() => this.gc.pointDensity, action((val: number, oldVal: number) => {
      const newMaxLimit = parseFloat((val * 2).toFixed(3));

      for (const path of this.paths) {
        path.pc.applicationRange.maxLimit.label = newMaxLimit + "";
        path.pc.applicationRange.maxLimit.value = newMaxLimit;

        const ratio = val / oldVal;

        path.pc.applicationRange.from *= ratio;
        path.pc.applicationRange.from = parseFloat(path.pc.applicationRange.from.toFixed(3));
        path.pc.applicationRange.to *= ratio;
        path.pc.applicationRange.to = parseFloat(path.pc.applicationRange.to.toFixed(3));
      }

    }));

    this.newPathFile();
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

  clearSelected(): void {
    this.selected = [];
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

  clearExpanded(): void {
    this.expanded = [];
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

  @computed get expandedEntityIds(): string[] {
    return this.expanded.slice(); // ALGO: Return a copy
  }

  @computed get expandedEntityCount(): number {
    return this.expanded.length;
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

  @computed get selectedEntityIds(): string[] {
    return this.selected.slice(); // ALGO: Return a copy
  }

  @computed get selectedEntityCount(): number {
    return this.selected.length;
  }

  interestedPath(): Path | undefined {
    // ALGO: Return the selected path or last selected path or first path
    const check = this.selectedPath ?? this.lastInterestedPath ?? this.paths[0];
    const rtn = this.paths.some((path) => path.uid === check?.uid) ? check : undefined;

    runInAction(() => this.lastInterestedPath = rtn);

    return rtn;
  }

  @computed get fieldOffset() {
    return this.fieldDisplay.offset;
  }

  @computed get fieldScale() {
    return this.fieldDisplay.scale;
  }

  set fieldOffset(offset: Vector) {
    this.fieldDisplay.offset = offset;
  }

  set fieldScale(scale: number) {
    this.fieldDisplay.scale = clamp(scale, 1, 3);
  }

  resetUserControl(): void {
    this.selected = [];
    this.expanded = [];
    this.lastInterestedPath = undefined;
    this.magnet = new Vector(Infinity, Infinity);
  }

  resetFieldDisplay(): void {
    this.fieldDisplay = {
      offset: new Vector(0, 0),
      scale: 1
    }
  }

  execute(command: CancellableCommand): void {
    command.execute();
    this.history.push(command);
    this.redoHistory = [];

    console.log("execute", command, this.history.length, this.redoHistory.length);
    
  }

  undo(): void {
    const command = this.history.pop();
    if (command !== undefined) {
      command.undo();
      this.redoHistory.push(command);
    }
    console.log("undo", command, this.history.length, this.redoHistory.length);
    
  }

  redo(): void {
    const command = this.redoHistory.pop();
    if (command !== undefined) {
      command.redo();
      this.history.push(command);
    }
    console.log("redo", command, this.history.length, this.redoHistory.length);
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
    this.paths = pfd.paths;

    this.resetUserControl();
    this.resetFieldDisplay();
  }

  importPathFileData(data: Record<string, any>): void {
    const format = getAllFormats().find(f => f.getName() === data.format);
    if (format === undefined) throw new Error("Format not found.");
    format.init(); // ALGO: Suspend format reaction

    if (typeof data.gc !== "object") throw new Error("Invalid data format: gc is not an object.");
    const gc = plainToClassFromExist(format.buildGeneralConfig(), data.gc);

    if (!Array.isArray(data.paths)) throw new Error("Invalid data format: paths is not an array.");
    const paths = plainToInstance(Path, data.paths);

    for (const path of paths) {
      if (typeof path.pc !== "object") throw new Error("Invalid data format: pc is not an object.");
      path.pc = plainToClassFromExist(format.buildPathConfig(), path.pc);
    }

    this.setPathFileData(format, {
      format: format.getName(),
      gc: gc,
      paths: paths
    });
  }

  exportPathFileData(): Record<string, any> {
    const data: PathFileData = {
      format: this.format.getName(),
      gc: this.gc,
      paths: this.paths
    };

    return instanceToPlain(data);
  }

  newPathFile() {
    const newFormat = getAllFormats().find(format => format.getName() === this.format.getName());
    if (newFormat === undefined) return;

    newFormat.init(); // ALGO: Suspend format reaction

    this.format = newFormat;
    this.gc = this.format.buildGeneralConfig();
    this.usingUOL = this.gc.uol;
    this.paths = [];
    this.resetUserControl();
    this.resetFieldDisplay();
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
    format.init(); // ALGO: Suspend format reaction
    const pfd = format.recoverPathFileData(fileContent);

    this.setPathFileData(format, pfd);
  }

  exportPathFile(): string | undefined {
    return this.format.exportPathFile(this);
  }
}
