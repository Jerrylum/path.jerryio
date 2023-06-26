import { makeAutoObservable, computed, runInAction, reaction, action } from "mobx"
import DOMPurify from 'dompurify'; // cspell:disable-line
import { GeneralConfig, convertGeneralConfigUOL, convertPathConfigPointDensity } from "../format/Config";
import { InteractiveEntity } from "../types/Canvas";
import { Control, EndPointControl, Path, Vector } from "../types/Path";
import { addToArray, clamp, removeFromArray } from "./Util";
import { PathFileData, Format, getAllFormats } from "../format/Format";
import { PathDotJerryioFormatV0_1 } from "../format/PathDotJerryioFormatV0_1";
import { plainToInstance, instanceToPlain, plainToClassFromExist } from 'class-transformer';
import { Quantity, UnitConverter, UnitOfLength } from "../types/Unit";
import { CommandHistory } from "../types/Command";
import { SemVer } from "semver";
import { Confirmation } from "./Confirmation";
import React from "react";
import { Help } from "./HelpDialog";
import { Preferences } from "./Preferences";
import { GoogleAnalytics } from "../types/GoogleAnalytics";
import { OutputFileHandle } from "../format/Output";
import { getPathSamplePoints, getUniformPointsFromSamples } from "../types/Calculation";

// observable class
export class MainApp {
  readonly appVersion = new SemVer("0.1.0");

  public format: Format = new PathDotJerryioFormatV0_1();
  private usingUOL: UnitOfLength = UnitOfLength.Centimeter;
  public mountingFile: OutputFileHandle = new OutputFileHandle(null); // This is intended to be modified outside the class

  public paths: Path[] = [];
  private selected: string[] = []; // ALGO: Not using Set because order matters
  private selectedBefore: string[] = []; // ALGO: For area selection
  private lastInterestedPath: Path | undefined = undefined; // ALGO: For adding controls
  private expanded: string[] = []; // ALGO: Order doesn't matter but anyway
  public magnet: Vector = new Vector(Infinity, Infinity);

  private _history: CommandHistory = new CommandHistory(this);

  public robot = {
    position: new EndPointControl(0, 0, 0),
  }

  public view = {
    showSpeedCanvas: true,
    showRightPanel: true
  }

  private fieldDisplay = {
    offset: new Vector(0, 0), // Clamp user input only
    scale: 1, // 1 = 100%, [1..3]
  }

  constructor() {
    makeAutoObservable(this);

    // NOTE: There is a reason why reactions are made here instead of in the constructor of the config class
    // A lot of things need to be updated when the format is changed, and it's easier to do it here

    reaction(() => this.format, action((newFormat: Format, oldFormat: Format) => {
      if (newFormat.isInit) return;

      // ALGO: this reaction should only be triggered when the format is changed by the user, not loading a file

      newFormat.init();

      const oldGC = oldFormat.getGeneralConfig();

      const keepPointDensity = this.gc.pointDensity;

      this.gc.robotWidth = oldGC.robotWidth;
      this.gc.robotHeight = oldGC.robotHeight;
      convertGeneralConfigUOL(this.gc, oldGC.uol);
      this.gc.pointDensity = keepPointDensity; // UX: Keep some values

      for (const path of this.paths) {
        const newPC = newFormat.buildPathConfig();

        if (newPC.speedLimit.minLimit === path.pc.speedLimit.minLimit && newPC.speedLimit.maxLimit === path.pc.speedLimit.maxLimit) {
          newPC.speedLimit = path.pc.speedLimit; // UX: Keep speed limit if the new format has the same speed limit range as the old one
        }
        newPC.bentRateApplicableRange = path.pc.bentRateApplicableRange; // UX: Keep application range
        path.pc = newPC;
        convertPathConfigPointDensity(newPC, oldGC.pointDensity, this.gc.pointDensity);
      }

      this.resetUserControl();

      this._history.clearHistory();
    }));

    reaction(() => this.gc.uol, action((newUOL: UnitOfLength, oldUOL: UnitOfLength) => {
      if (this.usingUOL === newUOL) return;

      const uc = new UnitConverter(oldUOL, newUOL);

      for (const path of this.paths) {
        for (const control of path.controls) {
          control.x = uc.fromAtoB(control.x);
          control.y = uc.fromAtoB(control.y);
        }
      }

      this.usingUOL = newUOL;
    }));

    reaction(() => this.gc.showRobot, action((showRobot: boolean) => {
      if (!showRobot) {
        this.robot.position.visible = false;
      }
    }));

    this.newPathFile();
  }

  @computed get gc(): GeneralConfig {
    return this.format.getGeneralConfig();
  }

  @computed get history(): CommandHistory {
    return this._history;
  }

  isSelected(x: InteractiveEntity | string): boolean {
    return typeof x === "string" ? this.selected.includes(x) : this.selected.includes(x.uid);
  }

  select(x: InteractiveEntity | string): boolean {
    return addToArray(this.selected, typeof x === "string" ? x : x.uid);
  }

  unselect(x: InteractiveEntity | string): boolean {
    return removeFromArray(this.selected, typeof x === "string" ? x : x.uid);
  }

  setSelected(x: InteractiveEntity[] | string[]): void {
    this.selected = typeof x[0] === "string" ? (x as string[]).slice() : x.map((cp) => (cp as InteractiveEntity).uid);
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

  @computed get allEntities(): InteractiveEntity[] {
    return [...this.paths, ...this.paths.flatMap((path) => path.controls)];
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

    // ALGO: Return the first selected path if: some paths are selected
    let rtn = this.paths.find((path) => this.isSelected(path));
    // ALGO: Return the first selected control point's path if: some control point is selected, the path visible and not locked
    if (rtn === undefined) rtn = this.paths.find((path) => path.controls.some((control) => this.isSelected(control)));

    return rtn;
  }

  @computed get selectedEntities(): InteractiveEntity[] {
    const rtn: InteractiveEntity[] = [];
    for (const path of this.paths) {
      if (this.isSelected(path)) rtn.push(path);
      for (const control of path.controls) {
        if (this.isSelected(control)) rtn.push(control);
      }
    }
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
    this.robot.position.visible = false;
  }

  resetFieldDisplay(): void {
    this.fieldDisplay = {
      offset: new Vector(0, 0),
      scale: 1
    }
  }

  private setPathFileData(format: Format, pfd: PathFileData): void {
    const purify = DOMPurify();

    this.expanded = [];
    for (const path of pfd.paths) {
      // SECURITY: Sanitize path names, beware of XSS attack from the path file
      const temp = purify.sanitize(path.name);
      path.name = temp === "" ? "Path" : temp;

      // ALGO: Link the first vector of each segment to the last vector of the previous segment
      for (let j = 1; j < path.segments.length; j++) {
        path.segments[j].first = path.segments[j - 1].last;
      }

      // UX: Expand all paths
      this.expanded.push(path.uid);
    }

    this.format = format;
    this.usingUOL = format.getGeneralConfig().uol;
    this.paths = pfd.paths;

    this.resetUserControl();
    this.resetFieldDisplay();

    this._history.clearHistory();
  }

  importPathFileData(data: Record<string, any>): void {
    const format = getAllFormats().find(f => f.getName() === data.format);
    if (format === undefined) throw new Error("Format not found.");
    format.init(); // ALGO: Suspend format reaction

    const appVersion = new SemVer(data.appVersion) // ALGO: Throw error if the app version is not a valid semver
    const compareResult = appVersion.compare(this.appVersion);
    if (appVersion.major !== this.appVersion.major) {
      throw new Error("The path file was created with a different major version of the editor. Import failed.");
    } if (compareResult > 0) {
      throw new Error("The path file was created with a newer version of the editor. Please update the editor.");
    } else if (compareResult < 0) {
      // TODO: Resolve backward compatibility
    }

    if (typeof data.gc !== "object") throw new Error("Invalid data format: gc is not an object.");
    const gc = plainToClassFromExist(format.getGeneralConfig(), data.gc);

    if (!Array.isArray(data.paths)) throw new Error("Invalid data format: paths is not an array.");
    const paths = plainToInstance(Path, data.paths);

    for (const path of paths) {
      if (typeof path.pc !== "object") throw new Error("Invalid data format: pc is not an object.");
      path.pc = plainToClassFromExist(format.buildPathConfig(), path.pc);
    }

    getAppStores().ga.gtag('event', 'import_file_format', { format: format.getName() });

    this.setPathFileData(format, { gc: gc, paths: paths });
  }

  exportPathFileData(): Record<string, any> {
    const data: PathFileData = { gc: this.format.getGeneralConfig(), paths: this.paths };
    return { ...{ appVersion: this.appVersion.version, format: this.format.getName() }, ...instanceToPlain(data) };
  }

  newPathFile() {
    const newFormat = this.format.createNewInstance();
    newFormat.init(); // ALGO: Suspend format reaction

    this.format = newFormat;
    this.usingUOL = this.gc.uol;
    this.paths = [];
    this.resetUserControl();
    this.resetFieldDisplay();

    this._history.clearHistory();
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
    const format = this.format.createNewInstance();
    format.init(); // ALGO: Suspend format reaction
    const pfd = format.recoverPathFileData(fileContent);

    this.setPathFileData(format, pfd);
  }

  exportPathFile(): string | undefined {
    return this.format.exportPathFile(this);
  }
}

export interface AppStores {
  app: MainApp;
  confirmation: Confirmation;
  help: Help;
  appPreferences: Preferences;
  ga: GoogleAnalytics;
}

const appStores: AppStores = {
  app: new MainApp(),
  confirmation: new Confirmation(),
  help: new Help(),
  appPreferences: new Preferences(),
  ga: new GoogleAnalytics()
};

export function getAppStores(): AppStores {
  return appStores;
}

const AppStoresContext = React.createContext(appStores);

const useAppStores = () => React.useContext(AppStoresContext);

export { useAppStores };

// @ts-ignore
(window.testFunction = action(() => {
  const { app } = getAppStores();

  const density = new Quantity(2, UnitOfLength.Centimeter);

  for (const path of app.paths) {
    console.log("path", path.uid);
    const sampleResult = getPathSamplePoints(path, density);
    console.log(sampleResult);
    const uniformResult = getUniformPointsFromSamples(sampleResult, density);
    console.log(uniformResult);
  }
}))();
