import { InteractiveEntity } from "./Canvas";

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

  execute(title: string, command: CancellableCommand, mergeTimeout = 500): void {
    command.execute();

    const exe = { title, command, time: Date.now(), mergeTimeout };

    if (exe.title === this.lastExecution?.title && exe.time - this.lastExecution.time < exe.mergeTimeout) {
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
    }
    console.log("undo", this.history.length, this.redoHistory.length);
  }

  redo(): void {
    const command = this.redoHistory.pop();
    if (command !== undefined) {
      command.redo();
      this.history.push(command);
    }
    console.log("redo", command, this.history.length, this.redoHistory.length);
  }
}

export interface Command {
  execute(): void;
}

export interface CancellableCommand extends Command {
  undo(): void;
  redo(): void;
  merge(command: this): void;
}

export class UpdatePropertiesCommand<TTarget> implements CancellableCommand {
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

  merge(latest: UpdatePropertiesCommand<TTarget>): void {
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

export class UpdateInstancesPropertiesCommand<TTarget> implements CancellableCommand {
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

  merge(latest: UpdateInstancesPropertiesCommand<TTarget>): void {
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

export class UpdateInteractiveEntities<TTarget extends InteractiveEntity> extends UpdateInstancesPropertiesCommand<TTarget> {
  constructor(protected targets: TTarget[], protected newValues: Partial<TTarget>) {
    super(targets, newValues);
  }
}
