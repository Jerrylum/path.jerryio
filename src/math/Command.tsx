import { MainApp } from "../app/MainApp";
import { InteractiveEntity } from "./Canvas";
import { Control, EndPointControl, Keyframe, KeyframePos, Path, Spline, SplineVariant } from "./Path";

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

  constructor(private app: MainApp) { }

  execute(title: string, command: CancellableCommand, mergeTimeout = 500): void {
    command.execute();

    const exe = { title, command, time: Date.now(), mergeTimeout };

    if (exe.title === this.lastExecution?.title &&
      isMergeable(exe.command) &&
      isMergeable(this.lastExecution.command) &&
      typeof (exe.command) === typeof (this.lastExecution.command) &&
      exe.time - this.lastExecution.time < exe.mergeTimeout) {
      this.lastExecution.command.merge(exe.command);
      this.lastExecution.time = exe.time;
    } else {
      this.commit();
      this.lastExecution = exe;
    }

    this.redoHistory = [];
  }

  commit(): void {
    if (this.lastExecution !== undefined) {
      this.history.push(this.lastExecution.command);
      this.lastExecution = undefined;
    }
  }

  undo(): void {
    this.commit();
    if (this.history.length > 0) {
      const command = this.history.pop()!;
      command.undo();
      this.redoHistory.push(command);

      if (isInteractiveEntitiesCommand(command)) this.app.setSelected(command.entities);
    }
    console.log("undo", this.history.length, this.redoHistory.length);
  }

  redo(): void {
    const command = this.redoHistory.pop();
    if (command !== undefined) {
      command.redo();
      this.history.push(command);

      if (isInteractiveEntitiesCommand(command)) this.app.setSelected(command.entities);
    }
    console.log("redo", command, this.history.length, this.redoHistory.length);
  }
}

export interface Command {
  execute(): void;
}

export interface MergeableCommand extends Command {
  merge(command: MergeableCommand): void;
}

export interface CancellableCommand extends Command {
  undo(): void;
  redo(): void;
}

export interface InteractiveEntitiesCommand extends CancellableCommand {
  // The entities that are affected by this command, highlighted in the canvas when undo/redo
  entities: InteractiveEntity[];
}

export function isMergeable(object: Command): object is MergeableCommand {
  return 'merge' in object;
}

export function isInteractiveEntitiesCommand(object: Command): object is InteractiveEntitiesCommand {
  return 'entities' in object;
}

/**
 * ALGO: Assume execute() function are called before undo(), redo() and other functions defined in the class
 */

export class UpdateProperties<TTarget> implements CancellableCommand, MergeableCommand {
  protected previousValue?: Partial<TTarget>;

  constructor(protected target: TTarget, protected newValues: Partial<TTarget>) { }

  execute(): void {
    this.previousValue = this.updateProperties(this.newValues);
  }

  undo(): void {
    this.updateProperties(this.previousValue!);
    this.previousValue = undefined;
  }

  redo(): void {
    this.execute();
  }

  merge(latest: UpdateProperties<TTarget>): void {
    this.previousValue = { ...latest.previousValue, ...this.previousValue };
    this.newValues = { ...this.newValues, ...latest.newValues };
  }

  protected updateProperties(values: Partial<TTarget>): Partial<TTarget> {
    const target = this.target;

    const previousValues: Partial<TTarget> = {} as Partial<TTarget>;
    for (const key in values) {
      previousValues[key] = target[key];
      target[key] = values[key]!;
    }

    return previousValues;
  }

}

export class UpdateInstancesProperties<TTarget> implements CancellableCommand {
  protected previousValue?: Partial<TTarget>[];

  constructor(protected targets: TTarget[], protected newValues: Partial<TTarget>) { }

  execute(): void {
    this.previousValue = [];
    for (let i = 0; i < this.targets.length; i++) {
      this.previousValue.push(this.updatePropertiesForTarget(this.targets[i], this.newValues));
    }
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

  merge(latest: UpdateInstancesProperties<TTarget>): void {
    // ALGO: Assume that the targets are the same and both commands are executed
    for (let i = 0; i < this.targets.length; i++) {
      this.previousValue![i] = { ...latest.previousValue![i], ...this.previousValue![i] };
      this.newValues = { ...this.newValues, ...latest.newValues };
    }
  }

  protected updatePropertiesForTarget(target: TTarget, values: Partial<TTarget>): Partial<TTarget> {
    const previousValues: Partial<TTarget> = {} as Partial<TTarget>;
    for (const key in values) {
      previousValues[key] = target[key];
      target[key] = values[key]!;
    }

    return previousValues;
  }
}

export class UpdateInteractiveEntities<TTarget extends InteractiveEntity> extends UpdateInstancesProperties<TTarget> implements InteractiveEntitiesCommand {
  constructor(protected targets: TTarget[], protected newValues: Partial<TTarget>) {
    super(targets, newValues);
  }

  get entities(): TTarget[] {
    return this.targets.slice();
  }
}

export class AddSpline implements CancellableCommand, InteractiveEntitiesCommand {
  protected _entities: InteractiveEntity[] = [];

  protected forward: boolean = true;
  protected spline?: Spline;

  constructor(protected path: Path, protected end: EndPointControl, protected variant: SplineVariant) { }

  protected addLine(): void {
    if (this.path.splines.length === 0) {
      this.spline = new Spline(new EndPointControl(0, 0, 0), [], this.end);
      this._entities.push(this.end);
    } else {
      const last = this.path.splines[this.path.splines.length - 1];
      this.spline = new Spline(last.last, [], this.end);
      this._entities.push(this.end);
    }
    this.path.splines.push(this.spline);
  }

  protected addCurve(): void {
    const p3 = this.end;

    if (this.path.splines.length === 0) {
      const p0 = new EndPointControl(0, 0, 0);
      const p1 = new Control(p0.x, p0.y + 24);
      const p2 = new Control(p3.x, p3.y - 24);
      this.spline = new Spline(p0, [p1, p2], p3);
      this._entities.push(p0, p1, p2, p3);
    } else {
      const last = this.path.splines[this.path.splines.length - 1];
      const p0 = last.last;
      const c = last.controls.length < 4 ? last.controls[0] : last.controls[2];
      const p1 = p0.mirror(new Control(c.x, c.y));
      const p2 = p0.divide(new Control(2, 2)).add(p3.divide(new Control(2, 2)));

      this.spline = new Spline(p0, [p1, p2], p3);
      this._entities.push(p1, p2, p3);
    }
    this.path.splines.push(this.spline);
  }

  execute(): void {
    if (this.variant === SplineVariant.LINEAR) {
      this.addLine();
    } else if (this.variant === SplineVariant.CURVE) {
      this.addCurve();
    }
    this.forward = true;
  }

  undo(): void {
    this.path.splines.pop();
    this.forward = false;
  }

  redo(): void {
    // this.execute();
    // ALGO: Instead of executing, we just add the spline back
    // ALGO: Assume that the command is executed
    this.path.splines.push(this.spline!);
    this.forward = true;
  }

  get entities(): InteractiveEntity[] {
    return this.forward ? this._entities : [];
  }
}

export class ConvertSpline implements CancellableCommand, InteractiveEntitiesCommand {
  protected previousControls: Control[] = [];

  constructor(protected path: Path, protected spline: Spline, protected variant: SplineVariant) { }

  protected convertToLine(): void {
    this.spline.controls.splice(1, this.spline.controls.length - 2);
  }

  protected convertToCurve(): void {
    let index = this.path.splines.indexOf(this.spline);
    let found = index !== -1;
    if (!found) return;

    let prev: Spline | null = null;
    if (index > 0) {
      prev = this.path.splines[index - 1];
    }

    let next: Spline | null = null;
    if (index + 1 < this.path.splines.length) {
      next = this.path.splines[index + 1];
    }

    let p0 = this.spline.first;
    let p3 = this.spline.last;

    let p1: Control;
    if (prev !== null) {
      p1 = p0.mirror(prev.controls[prev.controls.length - 2]);
      // ensure is a control point (not an end point)
      p1 = new Control(p1.x, p1.y);
    } else {
      p1 = p0.divide(new Control(2, 2)).add(p3.divide(new Control(2, 2)));
    }

    let p2;
    if (next !== null) {
      p2 = p3.mirror(next.controls[1]);
    } else {
      p2 = p0.divide(new Control(2, 2)).add(p3.divide(new Control(2, 2)));
    }

    this.spline.controls = [p0, p1, p2, p3];
  }

  execute(): void {
    this.previousControls = this.spline.controls.slice();
    if (this.variant === SplineVariant.LINEAR) {
      this.convertToLine();
    } else if (this.variant === SplineVariant.CURVE) {
      this.convertToCurve();
    }
  }

  undo(): void {
    this.spline.controls = this.previousControls.slice();
  }

  redo(): void {
    this.execute();
  }

  get entities(): InteractiveEntity[] {
    return this.spline.controls.slice(1, -1); // exclude first and last
  }
}

export class SplitSpline implements CancellableCommand, InteractiveEntitiesCommand {
  protected _entities: InteractiveEntity[] = [];

  protected forward: boolean = true;

  protected previousOriginalSplineControls: Control[] = [];
  protected newOriginalSplineControls: Control[] = [];
  protected newSpline?: Spline;

  constructor(protected path: Path, protected originalSpline: Spline, protected point: EndPointControl) { }

  execute(): void {
    this.previousOriginalSplineControls = this.originalSpline.controls.slice();

    const index = this.path.splines.indexOf(this.originalSpline);
    const found = index !== -1;
    if (!found) return;

    const cp_count = this.originalSpline.controls.length;
    if (cp_count === 2) {
      const last = this.originalSpline.last;
      this.originalSpline.last = this.point;
      this.newSpline = new Spline(this.point, [], last);
      this.path.splines.splice(index + 1, 0, this.newSpline);

      this._entities = [this.point];
    } else if (cp_count === 4) {
      const p0 = this.originalSpline.controls[0] as EndPointControl;
      const p1 = this.originalSpline.controls[1];
      const p2 = this.originalSpline.controls[2];
      const p3 = this.originalSpline.controls[3] as EndPointControl;

      const a = p1.divide(new Control(2, 2)).add(this.point.divide(new Control(2, 2)));
      const b = this.point;
      const c = p2.divide(new Control(2, 2)).add(this.point.divide(new Control(2, 2)));
      this.originalSpline.controls = [p0, p1, a, b];
      this.newSpline = new Spline(b, [c, p2], p3);
      this.path.splines.splice(index + 1, 0, this.newSpline);

      this._entities = [a, this.point, c];
    }

    this.newOriginalSplineControls = this.originalSpline.controls.slice();
    this.forward = true;
  }

  undo(): void {
    this.originalSpline.controls = this.previousOriginalSplineControls;
    const index = this.path.splines.indexOf(this.newSpline!);
    this.path.splines.splice(index, 1);

    this.forward = false;
  }

  redo(): void {
    // this.execute();
    // ALGO: Instead of executing, we just add the spline back
    // ALGO: Assume that the command is executed
    const index = this.path.splines.indexOf(this.originalSpline);
    this.originalSpline.controls = this.newOriginalSplineControls.slice();
    this.path.splines.splice(index + 1, 0, this.newSpline!);

    this.forward = true;
  }

  get entities(): InteractiveEntity[] {
    return this.forward ? this._entities : [];
  }
}

export class RemoveSpline implements CancellableCommand, InteractiveEntitiesCommand {
  protected _entities: InteractiveEntity[] = [];

  protected forward: boolean = true;
  protected index: number = -1;
  protected spline?: Spline;

  constructor(protected path: Path, protected point: EndPointControl) { }

  execute(): void {
    for (let i = 0; i < this.path.splines.length; i++) {
      const spline = this.path.splines[i];
      if (spline.first === this.point) { // pointer comparison
        // ALGO: This is the first control of the spline
        if (i !== 0) {
          const prev = this.path.splines[i - 1];
          prev.last = spline.last; // pointer assignment

          this._entities = spline.controls.slice(0, -1); // keep the last control
        } else {
          this._entities = spline.controls.slice();
        }
        this.path.splines.splice(i, 1);
      } else if (i + 1 === this.path.splines.length && spline.last === this.point) { // pointer comparison
        // ALGO: This is the last control of the last spline
        if (i !== 0) { // if this spline is not the first spline
          this._entities = spline.controls.slice(1); // keep the first control
        } else {
          this._entities = spline.controls.slice();
        }

        this.path.splines.splice(i, 1);
      } else {
        continue;
      }

      this.index = i;
      this.spline = spline;
      break;
    }

    this.forward = true;
  }

  undo(): void {
    if (this.index === -1) return;

    this.path.splines.splice(this.index, 0, this.spline!);
    if (this.spline?.first === this.point && this.index > 0) {
      const prev = this.path.splines[this.index - 1];
      prev.last = this.spline.first; // pointer assignment
    }

    this.forward = false;
  }

  redo(): void {
    // this.execute();
    // ALGO: Instead of executing, we just add the spline back
    // ALGO: Assume that the command is executed
    if (this.index === -1) return;

    this.path.splines.splice(this.index, 1);
    if (this.spline?.first === this.point && this.index > 0) {
      const prev = this.path.splines[this.index - 1];
      prev.last = this.spline.last; // pointer assignment
    }

    this.forward = true;
  }

  get removedEntities(): InteractiveEntity[] {
    return this._entities;
  }

  get entities(): InteractiveEntity[] {
    return this.forward ? [] : this._entities;
  }
}

export class AddKeyframe implements CancellableCommand {
  protected kf?: Keyframe;

  constructor(protected path: Path, protected pos: KeyframePos) { }

  execute(): void {
    // sort and push
    this.kf = new Keyframe(this.pos.xPos, this.pos.yPos);
    this.pos.spline.speedProfiles.push(this.kf);
    this.pos.spline.speedProfiles.sort((a, b) => a.xPos - b.xPos);
  }

  undo(): void {
    this.pos.spline.speedProfiles.splice(this.pos.spline.speedProfiles.indexOf(this.kf!), 1);
  }

  redo(): void {
    // this.execute();
    // ALGO: Instead of executing, we just add the keyframe back
    // ALGO: Assume that the command is executed
    this.pos.spline.speedProfiles.push(this.kf!);
    this.pos.spline.speedProfiles.sort((a, b) => a.xPos - b.xPos);
  }

  get keyframe(): Keyframe {
    return this.kf!;
  }
}

export class MoveKeyframe implements CancellableCommand, MergeableCommand {
  protected oldPos?: KeyframePos;

  constructor(protected path: Path, protected newPos: KeyframePos, protected kf: Keyframe) { }

  removeKeyframe(pos: KeyframePos) {
    const idx = pos.spline.speedProfiles.indexOf(this.kf);
    if (idx === -1) return;

    pos.spline.speedProfiles.splice(idx, 1);
  }

  addKeyframe(pos: KeyframePos) {
    this.kf.xPos = pos.xPos;
    this.kf.yPos = pos.yPos;
    pos.spline.speedProfiles.push(this.kf);
    pos.spline.speedProfiles.sort((a, b) => a.xPos - b.xPos);
  }

  execute(): void {
    // remove keyframe from oldSpline speed control
    for (const spline of this.path.splines) {
      const idx = spline.speedProfiles.indexOf(this.kf);
      if (idx === -1) continue;

      spline.speedProfiles.splice(idx, 1);
      this.oldPos = { spline, xPos: this.kf.xPos, yPos: this.kf.yPos };
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
    if (command.kf !== this.kf) return;

    this.newPos = command.newPos;
  }
}

export class RemoveKeyframe implements CancellableCommand {
  protected spline?: Spline;
  protected oldIdx = -1;

  constructor(protected path: Path, protected kf: Keyframe) { }

  execute(): void {
    for (const spline of this.path.splines) {
      const idx = spline.speedProfiles.indexOf(this.kf);
      if (idx === -1) continue;

      spline.speedProfiles.splice(idx, 1);
      this.spline = spline;
      this.oldIdx = idx;
      break;
    }
  }

  undo(): void {
    if (this.spline === undefined || this.oldIdx === -1) return;

    this.spline.speedProfiles.splice(this.oldIdx, 0, this.kf);
  }

  redo(): void {
    // this.execute();
    // ALGO: Instead of executing, we just remove the keyframe
    // ALGO: Assume that the command is executed
    if (this.spline === undefined || this.oldIdx === -1) return;

    this.spline.speedProfiles.splice(this.oldIdx, 1);
  }
}
