import { makeAutoObservable } from "mobx";
import { MainApp, getAppStores } from "./MainApp";
import { Logger } from "./Logger";
import {
  AnyControl,
  Control,
  EndControl,
  Keyframe,
  KeyframePos,
  Path,
  PathTreeItem,
  Segment,
  SegmentControls,
  SegmentVariant,
  Vector,
  construct,
  traversal
} from "./Path";

const logger = Logger("History");

export interface Execution {
  title: string;
  command: CancellableCommand;
  time: number;
  mergeTimeout: number;
}

export class CommandHistory {
  private lastExecution: Execution | undefined = undefined;
  private history: CancellableCommand[] = [];
  private redoHistory: CancellableCommand[] = [];
  private saveStepCounter: number = 0;

  constructor(private app: MainApp) {
    makeAutoObservable(this);
  }

  execute(title: string, command: CancellableCommand, mergeTimeout = 500): void {
    const result = command.execute();
    if (result === false) return;

    // UX: Unselect and collapse removed items
    if (isRemovePathTreeItemsCommand(command)) {
      command.removedItems.forEach(item => this.unlink(item));
    }

    const exe = { title, command, time: Date.now(), mergeTimeout };

    if (
      exe.title === this.lastExecution?.title &&
      isMergeable(exe.command) &&
      isMergeable(this.lastExecution.command) &&
      typeof exe.command === typeof this.lastExecution.command &&
      exe.time - this.lastExecution.time < exe.mergeTimeout &&
      this.lastExecution.command.merge(exe.command)
    ) {
      this.lastExecution.time = exe.time;
    } else {
      this.commit();
      this.lastExecution = exe;

      logger.log("EXECUTE", exe.title);
    }

    this.redoHistory = [];
  }

  commit(): void {
    if (this.lastExecution !== undefined) {
      this.history.push(this.lastExecution.command);
      this.saveStepCounter++;
      this.lastExecution = undefined;

      const { appPreferences } = getAppStores();
      while (this.history.length > appPreferences.maxHistory) this.history.shift();
    }
  }

  undo(): void {
    this.commit();
    const command = this.history.pop();
    if (command !== undefined) {
      command.undo();
      this.redoHistory.push(command);
      this.saveStepCounter--;

      const a = isAddPathTreeItemsCommand(command);
      const u = isUpdatePathTreeItemsCommand(command);
      const r = isRemovePathTreeItemsCommand(command);

      // UX: Set select removed or updated items
      if (r || u) {
        const selected: PathTreeItem[] = [];
        if (r) selected.push(...command.removedItems);
        if (u) selected.push(...command.updatedItems);
        this.app.setSelected(Array.from(new Set(selected)));
      }

      // UX: Collapse added items
      if (a) {
        command.addedItems.forEach(item => this.unlink(item));
      }
    }
    logger.log("UNDO", this.history.length, "->", this.redoHistory.length);
  }

  redo(): void {
    const command = this.redoHistory.pop();
    if (command !== undefined) {
      command.redo();
      this.history.push(command);
      this.saveStepCounter++;

      const a = isAddPathTreeItemsCommand(command);
      const u = isUpdatePathTreeItemsCommand(command);
      const r = isRemovePathTreeItemsCommand(command);

      // UX: Set select added or updated items
      if (a || u) {
        const selected: PathTreeItem[] = [];
        if (a) selected.push(...command.addedItems);
        if (u) selected.push(...command.updatedItems);
        this.app.setSelected(Array.from(new Set(selected)));
      }

      // UX: Collapse removed items
      if (r) {
        command.removedItems.forEach(item => this.unlink(item));
      }
    }
    logger.log("REDO", this.history.length, "<-", this.redoHistory.length);
  }

  clearHistory(): void {
    this.lastExecution = undefined;
    this.history = [];
    this.redoHistory = [];
    this.saveStepCounter = 0;
  }

  save(): void {
    this.commit();
    this.saveStepCounter = 0;
  }

  isModified(): boolean {
    this.commit();
    return this.saveStepCounter !== 0;
  }

  get canUndo() {
    return this.undoHistorySize !== 0 || this.lastExecution !== undefined;
  }

  get canRedo() {
    return this.redoHistorySize !== 0;
  }

  get undoHistorySize() {
    return this.history.length;
  }

  get redoHistorySize() {
    return this.redoHistory.length;
  }

  private unlink(item: PathTreeItem) {
    this.app.unselect(item);
    if (item instanceof Path) this.app.removeExpanded(item);
    if (this.app.hoverItem === item.uid) this.app.hoverItem = undefined;
  }
}

export interface Command {
  /**
   * Execute the command
   *
   * @returns true if the command was executed, false otherwise (e.g. if the command is not valid or no change is made)
   */
  execute(): void | boolean;
}

export interface MergeableCommand extends Command {
  /**
   * @param command The command to merge with
   * @returns true if the command was merged, false otherwise
   */
  merge(command: MergeableCommand): boolean;
}

export interface CancellableCommand extends Command {
  undo(): void;
  redo(): void;
}

export interface AddPathTreeItemsCommand extends Command {
  addedItems: readonly PathTreeItem[];
}

export interface UpdatePathTreeItemsCommand extends Command {
  updatedItems: readonly PathTreeItem[];
}

export interface RemovePathTreeItemsCommand extends Command {
  removedItems: readonly PathTreeItem[];
}

export function isMergeable(object: Command): object is MergeableCommand {
  return "merge" in object;
}

export function isAddPathTreeItemsCommand(object: Command): object is AddPathTreeItemsCommand {
  return "addedItems" in object;
}

export function isUpdatePathTreeItemsCommand(object: Command): object is UpdatePathTreeItemsCommand {
  return "updatedItems" in object;
}

export function isRemovePathTreeItemsCommand(object: Command): object is RemovePathTreeItemsCommand {
  return "removedItems" in object;
}

/**
 * ALGO: Assume execute() function are called before undo(), redo() and other functions defined in the class
 */

export class UpdateInstancesProperties<TTarget> implements CancellableCommand, MergeableCommand {
  protected changed = false;
  protected previousValue?: Partial<TTarget>[];

  constructor(protected targets: TTarget[], protected newValues: Partial<TTarget>) {}

  execute(): boolean {
    this.previousValue = [];
    for (let i = 0; i < this.targets.length; i++) {
      const { changed, previousValues } = this.updatePropertiesForTarget(this.targets[i], this.newValues);
      this.changed = this.changed || changed;
      this.previousValue.push(previousValues);
    }

    return this.changed;
  }

  undo(): void {
    for (let i = 0; i < this.targets.length; i++) {
      this.updatePropertiesForTarget(this.targets[i], this.previousValue![i]);
    }
    this.previousValue = undefined;
  }

  redo(): void {
    this.execute();
  }

  merge(latest: UpdateInstancesProperties<TTarget>): boolean {
    // ALGO: Assume that the targets are the same and both commands are executed
    for (let i = 0; i < this.targets.length; i++) {
      this.previousValue![i] = {
        ...latest.previousValue![i],
        ...this.previousValue![i]
      };
      this.newValues = { ...this.newValues, ...latest.newValues };
    }
    return true;
  }

  protected updatePropertiesForTarget(
    target: TTarget,
    values: Partial<TTarget>
  ): { changed: boolean; previousValues: Partial<TTarget> } {
    let changed = false;
    const previousValues: Partial<TTarget> = {} as Partial<TTarget>;
    for (const key in values) {
      previousValues[key] = target[key];
      target[key] = values[key]!;
      changed = changed || target[key] !== previousValues[key];
    }

    return { changed, previousValues };
  }
}

export class UpdateProperties<TTarget> extends UpdateInstancesProperties<TTarget> {
  constructor(protected target: TTarget, protected newValues: Partial<TTarget>) {
    super([target], newValues);
  }
}

export class UpdatePathTreeItems extends UpdateInstancesProperties<PathTreeItem> implements UpdatePathTreeItemsCommand {
  constructor(protected targets: PathTreeItem[], protected newValues: Partial<PathTreeItem>) {
    super(targets, newValues);
  }

  get updatedItems(): readonly PathTreeItem[] {
    return this.targets.slice();
  }
}

export class AddSegment implements CancellableCommand, AddPathTreeItemsCommand {
  protected _entities: PathTreeItem[] = [];

  protected segment?: Segment;

  constructor(protected path: Path, protected end: EndControl, protected variant: SegmentVariant) {}

  protected addLine(): void {
    if (this.path.segments.length === 0) {
      this.segment = new Segment(new EndControl(0, 0, 0), this.end);
      this._entities.push(this.end);
    } else {
      const last = this.path.segments[this.path.segments.length - 1];
      this.segment = new Segment(last.last, this.end);
      this._entities.push(this.end);
    }
    this.path.segments.push(this.segment);
  }

  protected addCurve(): void {
    const p3 = this.end;

    if (this.path.segments.length === 0) {
      const p0 = new EndControl(0, 0, 0);
      const p1 = new Control(p0.x, p3.y);
      const p2 = new Control(p3.x, p0.y);
      this.segment = new Segment(p0, p1, p2, p3);
      this._entities.push(p0, p1, p2, p3);
    } else {
      const last = this.path.segments[this.path.segments.length - 1];
      const p0 = last.last;
      const c = last.controls.length === 2 ? last.controls[0] : last.controls[2];
      const p1 = p0.mirror(new Control(c.x, c.y));
      const p2 = p0.divide(new Control(2, 2)).add(p3.divide(new Control(2, 2)));

      this.segment = new Segment(p0, p1, p2, p3);
      this._entities.push(p1, p2, p3);
    }
    this.path.segments.push(this.segment);
  }

  execute(): void {
    if (this.variant === SegmentVariant.Linear) {
      this.addLine();
    } else if (this.variant === SegmentVariant.Cubic) {
      this.addCurve();
    }
  }

  undo(): void {
    this.path.segments.pop();
  }

  redo(): void {
    // this.execute();
    // ALGO: Instead of executing, we just add the segment back
    // ALGO: Assume that the command is executed
    this.path.segments.push(this.segment!);
  }

  get addedItems(): readonly PathTreeItem[] {
    return this._entities;
  }
}

export class ConvertSegment implements CancellableCommand, AddPathTreeItemsCommand, RemovePathTreeItemsCommand {
  protected previousControls: SegmentControls | undefined;
  protected newControls: SegmentControls | undefined;

  constructor(protected path: Path, protected segment: Segment, protected variant: SegmentVariant) {}

  protected convertToLine(): void {
    this.segment.controls.splice(1, this.segment.controls.length - 2);
  }

  protected convertToCurve(): void {
    const index = this.path.segments.indexOf(this.segment);
    const found = index !== -1;
    if (!found) return;

    const prev: Segment | undefined = this.path.segments[index - 1];
    const next: Segment | undefined = this.path.segments[index + 1];

    const p0 = this.segment.first;
    const p3 = this.segment.last;

    let temp: Vector;

    if (prev !== undefined) {
      temp = p0.mirror(prev.controls[prev.controls.length - 2].toVector());
    } else {
      temp = p0.add(p3.toVector()).divide(2);
    }
    const p1 = new Control(temp.x, temp.y);

    if (next !== undefined) {
      temp = p3.mirror(next.controls[1].toVector());
    } else {
      temp = p0.add(p3.toVector()).divide(2);
    }
    const p2 = new Control(temp.x, temp.y);

    this.segment.controls = [p0, p1, p2, p3];
  }

  execute(): void {
    this.previousControls = [...this.segment.controls];
    if (this.variant === SegmentVariant.Linear) {
      this.convertToLine();
    } else if (this.variant === SegmentVariant.Cubic) {
      this.convertToCurve();
    }
    this.newControls = [...this.segment.controls];
  }

  undo(): void {
    this.segment.controls = [...this.previousControls!]
  }

  redo(): void {
    this.segment.controls = [...this.newControls!];
  }

  get addedItems(): readonly PathTreeItem[] {
    return this.variant === SegmentVariant.Linear ? [] : this.segment.controls.slice(1, -1);
  }

  get removedItems(): readonly PathTreeItem[] {
    return this.variant === SegmentVariant.Linear ? this.segment.controls.slice(1, -1) : [];
  }
}

export class SplitSegment implements CancellableCommand, AddPathTreeItemsCommand {
  protected _entities: PathTreeItem[] = [];

  protected previousOriginalSegmentControls: SegmentControls | undefined;
  protected newOriginalSegmentControls: SegmentControls | undefined;
  protected newSegment?: Segment;

  constructor(protected path: Path, protected originalSegment: Segment, protected point: EndControl) {}

  execute(): void {
    this.previousOriginalSegmentControls = [...this.originalSegment.controls];

    const index = this.path.segments.indexOf(this.originalSegment);
    const found = index !== -1;
    if (!found) return;

    const cp_count = this.originalSegment.controls.length;
    if (cp_count === 2) {
      const last = this.originalSegment.last;
      this.originalSegment.last = this.point;
      this.newSegment = new Segment(this.point, last);
      this.path.segments.splice(index + 1, 0, this.newSegment);

      this._entities = [this.point];
    } else if (cp_count === 4) {
      const p0 = this.originalSegment.controls[0] as EndControl;
      const p1 = this.originalSegment.controls[1];
      const p2 = this.originalSegment.controls[2];
      const p3 = this.originalSegment.controls[3] as EndControl;

      const a = p1.divide(new Control(2, 2)).add(this.point.divide(new Control(2, 2)));
      const b = this.point;
      const c = p2.divide(new Control(2, 2)).add(this.point.divide(new Control(2, 2)));
      this.originalSegment.controls = [p0, p1, a, b];
      this.newSegment = new Segment(b, c, p2, p3);
      this.path.segments.splice(index + 1, 0, this.newSegment);

      this._entities = [a, this.point, c];
    }

    this.newOriginalSegmentControls = [...this.originalSegment.controls];
  }

  undo(): void {
    this.originalSegment.controls = this.previousOriginalSegmentControls!;
    const index = this.path.segments.indexOf(this.newSegment!);
    this.path.segments.splice(index, 1);
  }

  redo(): void {
    // this.execute();
    // ALGO: Instead of executing, we just add the segment back
    // ALGO: Assume that the command is executed
    const index = this.path.segments.indexOf(this.originalSegment);
    this.originalSegment.controls = [...this.newOriginalSegmentControls!];
    this.path.segments.splice(index + 1, 0, this.newSegment!);
  }

  get addedItems(): readonly PathTreeItem[] {
    return this._entities;
  }
}

export class DragControls implements CancellableCommand, MergeableCommand, UpdatePathTreeItemsCommand {
  constructor(protected main: AnyControl, protected from: Vector, protected to: Vector, protected followers: AnyControl[]) {}

  execute(): void {
    const offsetX = this.to.x - this.from.x;
    const offsetY = this.to.y - this.from.y;
    for (let cp of this.followers) {
      cp.x += offsetX;
      cp.y += offsetY;
    }

    this.main.setXY(this.to);
  }

  undo() {
    const offsetX = this.from.x - this.to.x;
    const offsetY = this.from.y - this.to.y;
    for (let cp of this.followers) {
      cp.x += offsetX;
      cp.y += offsetY;
    }

    this.main.setXY(this.from);
  }

  redo() {
    this.execute();
  }

  merge(command: DragControls): boolean {
    // check if followers are the same
    if (this.followers.length !== command.followers.length) return false;

    for (let i = 0; i < this.followers.length; i++) {
      if (this.followers[i] !== command.followers[i]) return false;
    }

    // check if main is the same
    if (this.main !== command.main) return false;

    this.to = command.to;

    return true;
  }

  get updatedItems(): readonly PathTreeItem[] {
    return [this.main, ...this.followers];
  }
}

export class AddKeyframe implements CancellableCommand {
  protected kf?: Keyframe;

  constructor(protected path: Path, protected pos: KeyframePos) {}

  execute(): void {
    // sort and push
    this.kf = new Keyframe(this.pos.xPos, this.pos.yPos);
    this.pos.segment.speedProfiles.push(this.kf);
    this.pos.segment.speedProfiles.sort((a, b) => a.xPos - b.xPos);
  }

  undo(): void {
    this.pos.segment.speedProfiles.splice(this.pos.segment.speedProfiles.indexOf(this.kf!), 1);
  }

  redo(): void {
    // this.execute();
    // ALGO: Instead of executing, we just add the keyframe back
    // ALGO: Assume that the command is executed
    this.pos.segment.speedProfiles.push(this.kf!);
    this.pos.segment.speedProfiles.sort((a, b) => a.xPos - b.xPos);
  }

  get keyframe(): Keyframe {
    return this.kf!;
  }
}

export class MoveKeyframe implements CancellableCommand, MergeableCommand {
  protected oldPos?: KeyframePos;

  constructor(protected path: Path, protected newPos: KeyframePos, protected kf: Keyframe) {}

  removeKeyframe(pos: KeyframePos) {
    const idx = pos.segment.speedProfiles.indexOf(this.kf);
    if (idx === -1) return;

    pos.segment.speedProfiles.splice(idx, 1);
  }

  addKeyframe(pos: KeyframePos) {
    this.kf.xPos = pos.xPos;
    this.kf.yPos = pos.yPos;
    pos.segment.speedProfiles.push(this.kf);
    pos.segment.speedProfiles.sort((a, b) => a.xPos - b.xPos);
  }

  execute(): void {
    // remove keyframe from oldSegment speed control
    for (const segment of this.path.segments) {
      const idx = segment.speedProfiles.indexOf(this.kf);
      if (idx === -1) continue;

      segment.speedProfiles.splice(idx, 1);
      this.oldPos = { segment, xPos: this.kf.xPos, yPos: this.kf.yPos };
      break;
    }
    this.addKeyframe(this.newPos);
  }

  undo(): void {
    if (!this.oldPos) return;

    this.removeKeyframe(this.newPos);
    this.addKeyframe(this.oldPos);
  }

  redo(): void {
    // this.execute();
    // ALGO: Instead of executing, we just add the keyframe back
    // ALGO: Assume that the command is executed
    if (!this.oldPos) return;

    this.removeKeyframe(this.oldPos);
    this.addKeyframe(this.newPos);
  }

  merge(command: MoveKeyframe) {
    if (command.kf !== this.kf) return false;

    this.newPos = command.newPos;

    return true;
  }
}

export class RemoveKeyframe implements CancellableCommand {
  protected segment?: Segment;
  protected oldIdx = -1;

  constructor(protected path: Path, protected kf: Keyframe) {}

  execute(): void {
    for (const segment of this.path.segments) {
      const idx = segment.speedProfiles.indexOf(this.kf);
      if (idx === -1) continue;

      segment.speedProfiles.splice(idx, 1);
      this.segment = segment;
      this.oldIdx = idx;
      break;
    }
  }

  undo(): void {
    if (this.segment === undefined || this.oldIdx === -1) return;

    this.segment.speedProfiles.splice(this.oldIdx, 0, this.kf);
  }

  redo(): void {
    // this.execute();
    // ALGO: Instead of executing, we just remove the keyframe
    // ALGO: Assume that the command is executed
    if (this.segment === undefined || this.oldIdx === -1) return;

    this.segment.speedProfiles.splice(this.oldIdx, 1);
  }
}

export class RemovePathsAndEndControls implements CancellableCommand, RemovePathTreeItemsCommand {
  protected _entities: PathTreeItem[] = [];

  protected removalPaths: Path[] = [];
  protected removalEndControls: { path: Path; control: EndControl }[] = [];
  protected affectedPaths: { index: number; path: Path }[] = [];
  protected affectedSegments: {
    index: number;
    segment: Segment;
    path: Path;
    linkNeeded: boolean;
  }[] = [];

  /**
   * Remove paths and end controls in the entities list
   *
   * Compared to RemovePathTreeItems, it usually remove all related segments
   *
   * @param paths all paths in the editor
   * @param entities entities to remove
   */
  constructor(protected paths: Path[], entities: (string | PathTreeItem)[]) {
    // ALGO: Create a set of all entity uids
    const allEntities = new Set(entities.map(e => (typeof e === "string" ? e : e.uid)));

    // ALGO: Loop through all paths, add the path and end controls to the removal list if they are in the entity list
    for (const path of paths) {
      if (allEntities.delete(path.uid)) {
        this.removalPaths.push(path);
      } else {
        // ALGO: Only add the end control if the path is not already in the removal list
        for (const control of path.controls) {
          if (control instanceof EndControl && allEntities.delete(control.uid)) {
            this.removalEndControls.push({ path, control });
          }
        }
      }
    }
  }

  protected removePath(path: Path): boolean {
    const idx = this.paths.indexOf(path);
    if (idx === -1) return false;

    this.paths.splice(idx, 1);
    this.affectedPaths.push({ index: idx, path });
    this._entities.push(path, ...path.controls);
    return true;
  }

  protected removeControl(request: { path: Path; control: EndControl }): boolean {
    const { path, control } = request;
    for (let index = 0; index < path.segments.length; index++) {
      const segment = path.segments[index];

      const isFirstControlOfSegment = segment.first === control; // pointer comparison
      const isLastSegment = index + 1 === path.segments.length;
      const isLastControlOfLastSegment = isLastSegment && segment.last === control; // pointer comparison

      if ((isFirstControlOfSegment || isLastControlOfLastSegment) === false) continue;

      const isFirstSegment = index === 0;
      const isOnlySegment = path.segments.length === 1;
      const linkNeeded = isFirstControlOfSegment && isFirstSegment === false;

      if (linkNeeded) {
        const prev = path.segments[index - 1];
        prev.last = segment.last; // pointer assignment
      }

      // ALGO: Remove the segment at index i of the path segment list
      path.segments.splice(index, 1);
      this.affectedSegments.push({ index, segment, path, linkNeeded });

      if (isOnlySegment) {
        // ALGO: Define that all controls for the segment disappear
        this._entities.push(...segment.controls);
      } else if (isFirstControlOfSegment) {
        // ALGO: Define that all controls for the segment disappear except for the last one
        this._entities.push(...segment.controls.slice(0, -1));
      } else if (isLastControlOfLastSegment) {
        // ALGO: Define that all controls for the segment disappear except for the first one
        this._entities.push(...segment.controls.slice(1)); // keep the first control
      }
      return true;
    }

    return false;
  }

  execute(): boolean {
    if (this.hasTargets === false) return false;
    this.removalPaths.forEach(this.removePath.bind(this));
    this.removalEndControls.forEach(this.removeControl.bind(this));
    return true;
  }

  undo(): void {
    for (let i = this.affectedPaths.length - 1; i >= 0; i--) {
      const { index, path } = this.affectedPaths[i];
      this.paths.splice(index, 0, path);
    }

    for (let i = this.affectedSegments.length - 1; i >= 0; i--) {
      const { index, segment, path, linkNeeded } = this.affectedSegments[i];
      path.segments.splice(index, 0, segment);

      if (linkNeeded) {
        const prev = path.segments[index - 1];
        prev.last = segment.first; // pointer assignment
      }
    }
  }

  redo(): void {
    for (const { index } of this.affectedPaths) {
      this.paths.splice(index, 1);
    }

    for (const { index, segment, path, linkNeeded } of this.affectedSegments) {
      path.segments.splice(index, 1);

      if (linkNeeded) {
        const prev = path.segments[index - 1];
        prev.last = segment.last; // pointer assignment
      }
    }
  }

  get hasTargets(): boolean {
    return this.removalPaths.length > 0 || this.removalEndControls.length > 0;
  }

  get removedItems(): readonly PathTreeItem[] {
    return this._entities;
  }
}

export class MovePath implements CancellableCommand, UpdatePathTreeItemsCommand {
  protected _entities: PathTreeItem[] = [];

  constructor(protected paths: Path[], protected fromIdx: number, protected toIdx: number) {}

  public execute(): boolean {
    if (!this.isValid) return false;

    const path = this.paths.splice(this.fromIdx, 1)[0];
    this.paths.splice(this.toIdx, 0, path);

    this._entities = [path];

    return true;
  }

  public undo(): void {
    if (!this.isValid) return;

    const path = this.paths.splice(this.toIdx, 1)[0];
    this.paths.splice(this.fromIdx, 0, path);
  }

  public redo(): void {
    this.execute();
  }

  get isValid() {
    return this.fromIdx >= 0 && this.fromIdx < this.paths.length && this.toIdx >= 0 && this.toIdx < this.paths.length;
  }

  get updatedItems(): readonly PathTreeItem[] {
    return this._entities;
  }
}

export class MovePathTreeItem implements CancellableCommand, UpdatePathTreeItemsCommand, RemovePathTreeItemsCommand {
  protected _entities: PathTreeItem[] = [];
  protected moving: PathTreeItem | undefined;
  protected original: PathTreeItem[];
  protected modified: PathTreeItem[];

  constructor(protected allEntities: PathTreeItem[], protected fromIdx: number, protected toIdx: number) {
    this.original = this.allEntities.slice();
    this.modified = this.allEntities.slice();
  }

  execute(): boolean {
    if (!this.isValid) return false;

    this.moving = this.modified.splice(this.fromIdx, 1)[0];
    this.modified.splice(this.toIdx, 0, this.moving);

    const removed = construct(this.modified);
    if (removed === undefined) return false;

    this._entities = removed;

    return true;
  }

  undo(): void {
    construct(this.original);
  }

  redo(): void {
    construct(this.modified);
  }

  get isValid() {
    return (
      this.fromIdx >= 0 &&
      this.fromIdx < this.allEntities.length &&
      this.toIdx >= 0 &&
      this.toIdx < this.allEntities.length
    );
  }

  get updatedItems(): readonly PathTreeItem[] {
    return this.moving ? [this.moving] : [];
  }

  get removedItems(): readonly PathTreeItem[] {
    return this._entities;
  }
}

export class InsertPaths implements CancellableCommand, AddPathTreeItemsCommand {
  protected _entities: PathTreeItem[];

  constructor(protected paths: Path[], protected idx: number, protected inserting: Path[]) {
    this._entities = traversal(inserting);
  }

  execute(): boolean | void {
    if (!this.isValid) return false;

    this.paths.splice(this.idx, 0, ...this.inserting);
  }

  undo(): void {
    this.paths.splice(this.idx, this.inserting.length);
  }

  redo(): void {
    this.execute();
  }

  get isValid() {
    // ALGO: + 1 to index at the end
    return this.idx >= 0 && this.idx < this.paths.length + 1;
  }

  get addedItems() {
    return this._entities;
  }
}

export class InsertControls implements CancellableCommand, AddPathTreeItemsCommand, RemovePathTreeItemsCommand {
  protected _entities: PathTreeItem[] = [];
  protected original: PathTreeItem[];
  protected modified: PathTreeItem[];

  constructor(
    protected allEntities: PathTreeItem[],
    protected idx: number,
    protected inserting: AnyControl[]
  ) {
    this.original = this.allEntities.slice();
    this.modified = this.allEntities.slice();
  }

  execute(): boolean {
    if (!this.isValid) return false;

    this.modified.splice(this.idx, 0, ...this.inserting);

    const removed = construct(this.modified);
    if (removed === undefined) return false;

    this._entities = removed;

    return true;
  }

  undo(): void {
    construct(this.original);
  }

  redo(): void {
    construct(this.modified);
  }

  get isValid() {
    return (
      this.idx >= 1 && // ALGO: Index 0 is likely to be invalid
      this.idx < this.allEntities.length + 1 // ALGO: + 1 to index at the end
    );
  }

  get addedItems() {
    return this.inserting;
  }

  get removedItems() {
    return this._entities;
  }
}

export class AddPath extends InsertPaths {
  constructor(protected paths: Path[], protected path: Path) {
    super(paths, paths.length, [path]);
  }
}

export class RemovePathTreeItems implements CancellableCommand, RemovePathTreeItemsCommand {
  protected _entities: PathTreeItem[] = [];

  protected originalPaths: Path[];
  protected original: PathTreeItem[];
  protected existingPaths: Path[];
  protected modified: PathTreeItem[];

  constructor(protected paths: Path[], protected removal: PathTreeItem[]) {
    this.originalPaths = this.paths.slice();

    this.original = traversal(this.paths);

    this.existingPaths = this.paths.filter(p => removal.includes(p) === false);

    this.modified = traversal(this.existingPaths).filter(i => removal.includes(i) === false);
  }

  execute(): boolean {
    if (!this.isValid) return false;

    const removed = construct(this.modified);
    if (removed === undefined) return false;

    this.paths.splice(0, this.paths.length, ...this.existingPaths);
    this._entities = [...removed, ...this.removal];

    return true;
  }

  undo(): void {
    construct(this.original);
    this.paths.splice(0, this.paths.length, ...this.originalPaths);
  }

  redo(): void {
    construct(this.modified);
    this.paths.splice(0, this.paths.length, ...this.existingPaths);
  }

  get isValid() {
    return this.original.length !== this.modified.length;
  }

  get removedItems(): readonly PathTreeItem[] {
    return this._entities;
  }
}
