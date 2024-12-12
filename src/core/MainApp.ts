import { makeAutoObservable, computed, runInAction, reaction, action } from "mobx";
import DOMPurify from "dompurify"; // cspell:disable-line
import { GeneralConfig } from "../format/Config";
import { AnyControl, EndControl, Path, PathTreeItem, Vector, relatedPaths, traversal } from "./Path";
import { addToArray, removeFromArray, runInActionAsync } from "./Util";
import { Format, convertPathFileData, getAllFormats, importPDJDataFromTextFile } from "../format/Format";
import { promptFieldImage } from "./FieldImagePrompt";
import { PathDotJerryioFormatV0_1 } from "../format/PathDotJerryioFormatV0_1";
import { instanceToPlain, plainToClassFromExist } from "class-transformer";
import { Quantity, UnitConverter, UnitOfLength } from "./Unit";
import { CommandHistory } from "./Command";
import { SemVer } from "semver";
import { Confirmation } from "@app/common.blocks/modal/ConfirmationModal";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { IOFileHandle } from "./InputOutput";
import { getPathSamplePoints, getUniformPointsFromSamples } from "./Calculation";
import { APP_VERSION_STRING } from "../Version";
import { Logger } from "./Logger";
import { onLatestVersionChange } from "./Versioning";
import { enqueueSuccessSnackbar } from "@app/Notice";
import * as SWR from "./ServiceWorkerRegistration";
import { AppClipboard } from "./Clipboard";
import { validate } from "class-validator";
import { FieldEditor } from "./FieldEditor";
import { SpeedEditor } from "./SpeedEditor";
import { AssetManager, FieldImageAsset, FieldImageOriginType, getDefaultBuiltInFieldImage } from "./Asset";
import { Preferences, getPreference } from "./Preferences";
import { LemLibFormatV0_4 } from "../format/LemLibFormatV0_4";
import { LemLibFormatV1_0 } from "../format/LemLibFormatV1_0";
import { UserInterface } from "./Layout";
import { CoordinateSystem, Dimension, getNamedCoordinateSystems } from "./CoordinateSystem";

export const APP_VERSION = new SemVer(APP_VERSION_STRING);

const logger = Logger("App");

// observable class
export class MainApp {
  public format: Format =
    getAllFormats().find(f => f.getName() === getPreference("lastSelectedFormat", "")) ??
    new PathDotJerryioFormatV0_1();
  private usingUOL: UnitOfLength = UnitOfLength.Centimeter;
  public mountingFile: IOFileHandle = new IOFileHandle(null); // This is intended to be modified outside the class

  public paths: Path[] = [];
  public hoverItem: string | undefined = undefined;
  private selected: string[] = []; // ALGO: Not using Set because order matters
  private lastInterestedPath: Path | undefined = undefined; // ALGO: For adding controls
  private expanded: string[] = []; // ALGO: Order doesn't matter but anyway
  private fieldDimension_: Dimension = { width: 0, height: 0 };

  public robot = {
    position: new EndControl(0, 0, 0)
  };

  readonly history: CommandHistory = new CommandHistory(this);
  readonly fieldEditor = new FieldEditor();
  readonly speedEditor = new SpeedEditor();

  // null = loading, undefined = not available
  public latestVersion: SemVer | null | undefined = undefined;

  constructor() {
    makeAutoObservable(this);

    logger.log("Version", APP_VERSION_STRING);

    // NOTE: There is a reason why reactions are made here instead of in the constructor of the config class
    // A lot of things need to be updated when the format is changed, and it's easier to do it here

    reaction(
      () => this.format,
      action((newFormat: Format, oldFormat: Format) => {
        oldFormat.unregister();
        newFormat.register(this, ui);

        this.resetUserControl();
        this.resetAllEditors();

        this.history.clearHistory();
      })
    );

    reaction(
      () => this.gc.uol,
      action((newUOL: UnitOfLength, oldUOL: UnitOfLength) => {
        if (this.usingUOL === newUOL) return;

        const uc = new UnitConverter(oldUOL, newUOL);

        for (const path of this.paths) {
          for (const control of path.controls) {
            control.x = uc.fromAtoB(control.x);
            control.y = uc.fromAtoB(control.y);
          }
        }

        this.usingUOL = newUOL;
      })
    );

    reaction(
      () => this.gc.showRobot,
      action((showRobot: boolean) => {
        if (!showRobot) {
          this.robot.position.visible = false;
        }
      })
    );

    reaction(() => this.latestVersion, onLatestVersionChange);

    reaction(
      () => this.mountingFile.handle,
      handle => {
        if (handle !== null) {
          document.title = `${handle.name} | PATH.JERRYIO`;
        } else {
          document.title = "PATH.JERRYIO";
        }
      }
    );

    reaction(
      () => this.fieldImageAsset.signature,
      () => {
        this.fieldDimension_ = { width: 0, height: 0 };
        const signature = this.fieldImageAsset.signature;
        this.fieldImageAsset.getDimension().then(dimension => {
          if (signature === this.fieldImageAsset.signature) {
            runInAction(() => (this.fieldDimension_ = dimension));
          }
        });
      }
    );

    this.newFile();
  }

  onUIReady() {
    const lastTimeAppVersion = localStorage.getItem("appVersion");
    if (APP_VERSION_STRING !== lastTimeAppVersion) {
      localStorage.setItem("appVersion", APP_VERSION_STRING);
      if (lastTimeAppVersion !== null) enqueueSuccessSnackbar(logger, "Updated to v" + APP_VERSION_STRING);
    }
  }

  onSelectAll() {
    /*
    UX: "Select All" function
    If there is no selection, select all controls in all paths
    If there is a selection, check:
      Let S be a list of path tree items containing all related paths and their controls
      If S is equal to the current selection, select all controls in all paths
    Otherwise, select all controls in all related paths
    */

    const selected = this.selectedEntities;
    if (selected.length !== 0) {
      const selectedPaths = selected.filter(e => e instanceof Path) as Path[];
      if (selectedPaths.length !== 0) {
        const fullSelect = traversal(selectedPaths).length === selected.length;
        if (fullSelect) {
          this.setSelected(traversal(this.paths));
          return;
        }
      }
      this.setSelected(traversal(relatedPaths(this.paths, selected)));
    } else {
      this.setSelected(traversal(this.paths));
    }
  }

  @computed get gc(): GeneralConfig {
    return this.format.getGeneralConfig();
  }

  @computed get fieldImageAsset(): FieldImageAsset<FieldImageOriginType> {
    return assetManager.getAssetBySignature(this.gc.fieldImage.signature) ?? getDefaultBuiltInFieldImage();
  }

  @computed get fieldDimension(): Dimension {
    return this.fieldDimension_;
  }

  @computed get coordinateSystem(): CoordinateSystem {
    return (
      getNamedCoordinateSystems().find(cs => cs.name === this.gc.coordinateSystem) ?? getNamedCoordinateSystems()[0]
    );
  }

  isSelected(x: PathTreeItem | string): boolean {
    return typeof x === "string" ? this.selected.includes(x) : this.selected.includes(x.uid);
  }

  select(x: PathTreeItem | string): boolean {
    const uid = typeof x === "string" ? x : x.uid;
    return this.allEntityIds.includes(uid) && addToArray(this.selected, uid);
  }

  unselect(x: PathTreeItem | string): boolean {
    return removeFromArray(this.selected, typeof x === "string" ? x : x.uid);
  }

  setSelected(x: PathTreeItem[] | string[]): void {
    const uidArr = typeof x[0] === "string" ? (x as string[]) : (x as PathTreeItem[]).map(cp => cp.uid);
    this.selected = uidArr.filter(uid => this.allEntityIds.includes(uid));
  }

  clearSelected(): void {
    this.selected = [];
  }

  isExpanded(x: Path | string): boolean {
    return typeof x === "string" ? this.expanded.includes(x) : this.expanded.includes(x.uid);
  }

  addExpanded(x: Path | string): boolean {
    const uid = typeof x === "string" ? x : x.uid;
    return this.allEntityIds.includes(uid) && addToArray(this.expanded, uid);
  }

  removeExpanded(x: Path | string): boolean {
    return removeFromArray(this.expanded, typeof x === "string" ? x : x.uid);
  }

  clearExpanded(): void {
    this.expanded = [];
  }

  @computed get allEntities(): PathTreeItem[] {
    return traversal(this.paths);
  }

  @computed get allEntityIds(): string[] {
    return this.allEntities.map(entity => entity.uid);
  }

  @computed get allNavigableEntities(): PathTreeItem[] {
    const rtn: PathTreeItem[] = [];
    for (const path of this.paths) {
      if (this.isExpanded(path)) rtn.push(...traversal([path]));
      else rtn.push(path);
    }

    return rtn;
  }

  @computed get allNavigableEntityIds() {
    return this.allNavigableEntities.map(entity => entity.uid);
  }

  @computed get expandedEntityIds(): string[] {
    return this.expanded.slice(); // ALGO: Return a copy
  }

  @computed get expandedEntityCount(): number {
    return this.expanded.length;
  }

  @computed get selectableControls(): AnyControl[] {
    return this.selectablePaths.flatMap(path => path.controls.filter(control => control.visible && !control.lock));
  }

  @computed get selectablePaths(): Path[] {
    return this.paths.filter(path => path.visible && !path.lock);
  }

  @computed get selectedControl(): AnyControl | undefined {
    return this.paths
      .map(path => path.controls.find(control => control.uid === this.selected[0]))
      .find(control => control !== undefined);
  }

  @computed get selectedPath(): Path | undefined {
    if (this.selected.length === 0) return undefined;

    // ALGO: Return the first selected path if: some paths are selected
    let rtn = this.paths.find(path => this.isSelected(path));
    // ALGO: Return the first selected control point's path
    if (rtn === undefined) rtn = this.paths.find(path => path.controls.some(control => this.isSelected(control)));

    return rtn;
  }

  @computed get selectedEntities(): PathTreeItem[] {
    const rtn: PathTreeItem[] = [];
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
    const rtn = this.paths.some(path => path.uid === check?.uid) ? check : undefined;

    runInAction(() => (this.lastInterestedPath = rtn));

    return rtn;
  }

  resetUserControl(): void {
    this.selected = [];
    this.expanded = [];
    this.lastInterestedPath = undefined;
    this.robot.position.visible = false;
  }

  resetAllEditors(): void {
    this.fieldEditor.reset();
    this.speedEditor.reset();
  }

  resetFieldOffsetAndScale() {
    this.fieldEditor.offset = new Vector(0, 0);
    this.fieldEditor.scale = 1;
  }

  private setFormatAndPaths(format: Format, paths: Path[]): void {
    const purify = DOMPurify();

    this.expanded = [];
    for (const path of paths) {
      // SECURITY: Sanitize path names, beware of XSS attack from the path file
      const temp = purify.sanitize(path.name, { ALLOWED_TAGS: [] });
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
    this.paths = paths;
  }

  /**
   * Security: The input file buffer might be invalid and contain malicious code.
   *
   * @param data the path file data
   */
  async importPDJData(data: Record<string, any>): Promise<void> {
    // ALGO: Convert the path file to the app version
    while (data.appVersion !== APP_VERSION.version) {
      if (convertPathFileData(data) === false) throw new Error("Unable to open the path file. Try updating the app.");
    }

    const format = getAllFormats().find(f => f.getName() === data.format);
    if (format === undefined) throw new Error("Format not found.");

    if (data.gc?.fieldImage?.origin) format.getGeneralConfig().fieldImage.origin = undefined as any; // ALGO: Remove default origin

    const gc = plainToClassFromExist(format.getGeneralConfig(), data.gc, {
      excludeExtraneousValues: true,
      exposeDefaultValues: true
    });
    const paths: Path[] = [];
    for (const pathRaw of data.paths) {
      const path = format.createPath();
      const pathPC = path.pc;
      plainToClassFromExist(path, pathRaw, { excludeExtraneousValues: true, exposeDefaultValues: true });
      path.pc = plainToClassFromExist(pathPC, pathRaw.pc, { exposeDefaultValues: true });

      paths.push(path);
    }

    const errors = [...(await validate(gc)), ...(await Promise.all(paths.map(path => validate(path)))).flat()];
    if (errors.length > 0) {
      errors.forEach(e => logger.error("Validation errors", e.constraints, `in ${e.property}`, e));
      throw new Error("Unable to open the path file due to validation errors.");
    }

    ga.gtag("event", "import_file_format", { format: format.getName() });

    const result = await runInActionAsync(() => promptFieldImage(gc.fieldImage));
    if (result === false) gc.fieldImage = getDefaultBuiltInFieldImage().getSignatureAndOrigin();

    this.setFormatAndPaths(format, paths);
  }

  exportPDJData(): Record<string, any> {
    return {
      appVersion: APP_VERSION.version,
      format: this.format.getName(),
      ...instanceToPlain({ gc: this.format.getGeneralConfig(), paths: this.paths })
    };
  }

  newFile() {
    const newFormat = this.format.createNewInstance();

    this.format = newFormat;
    this.usingUOL = this.gc.uol;
    this.paths = [];
  }

  /**
   * Security: The input file buffer might be invalid and contain malicious code.
   *
   * @throws Error if the file can not be imported
   * @param buffer the path file buffer in ArrayBuffer
   */
  async importFile(buffer: ArrayBuffer): Promise<void> {
    /*
    Import PDJ data using user selected format

    Note that even if this function returned the path file data, it is not guaranteed that the data is in the same 
    format as the current one.
    */
    const importResult = this.format.importPDJDataFromFile(buffer);
    if (importResult !== undefined) {
      await this.importPDJData(importResult);
      return;
    }

    const testFormat2 = new LemLibFormatV1_0(); // Sample binary path file
    const importResult2 = testFormat2.importPDJDataFromFile(buffer);
    if (importResult2 !== undefined) {
      await this.importPDJData(importResult2);
      return;
    }

    const importResult3 = importPDJDataFromTextFile(buffer); // Input general text path file
    if (importResult3 !== undefined) {
      await this.importPDJData(importResult3);
      return;
    }

    // Import paths

    let format: Format;
    let paths: Path[] = [];
    try {
      format = this.format.createNewInstance();
      paths = format.importPathsFromFile(buffer);
    } catch (err) {
      format = new LemLibFormatV0_4(); // Sample text path file
      paths = format.importPathsFromFile(buffer);
    }

    const result = await runInActionAsync(() => promptFieldImage(format.getGeneralConfig().fieldImage));
    if (result === false) format.getGeneralConfig().fieldImage = getDefaultBuiltInFieldImage().getSignatureAndOrigin();

    this.setFormatAndPaths(format, paths);
  }

  /**
   * @throws Error if the file can not be exported
   * @returns the path file buffer in ArrayBuffer
   */
  exportFile(): ArrayBuffer {
    return this.format.exportFile();
  }
}

export type AppStores = typeof appStores;

const appPreferences = new Preferences();
const assetManager = new AssetManager();
const clipboard = new AppClipboard();
const confirmation = new Confirmation();
const ga = new GoogleAnalytics();
const ui = new UserInterface();
const app = new MainApp(); // ALGO: The app must be created last

const appStores = { app, appPreferences, assetManager, clipboard, confirmation, ga, ui } as const;

export function getAppStores(): AppStores {
  return appStores;
}

// @ts-ignore
(window.testFunction = action(() => {
  const { app } = getAppStores();

  const density = new Quantity(2, UnitOfLength.Centimeter);

  const logger = Logger("Test");

  for (const path of app.paths) {
    logger.log("path", path.uid);
    const sampleResult = getPathSamplePoints(path, density);
    logger.log(sampleResult);
    const uniformResult = getUniformPointsFromSamples(sampleResult, density);
    logger.log(uniformResult);
  }
}))();

// @ts-ignore
window.unregisterSW = action(() => {
  SWR.unregister();
});
