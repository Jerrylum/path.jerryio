import { InteractiveEntity } from "./Canvas";

export class CommandHistory {

  private lastExecutionTitle: string | undefined = undefined;
  private lastCommand: CancellableCommand | undefined = undefined;
  private history: CancellableCommand[] = [];
  private redoHistory: CancellableCommand[] = [];

  execute(title: string, command: CancellableCommand): void {
    command.execute();
    if (title === this.lastExecutionTitle) {
      // ALGO: Assume that the last command is the same type as the current one.
      this.lastCommand!.merge(command);
    } else {
      if (this.lastCommand !== undefined) {
        this.history.push(this.lastCommand);
      }

      this.lastExecutionTitle = title;
      this.lastCommand = command;
    }
    this.redoHistory = [];
  }

  undo(): void {
    if (this.lastCommand !== undefined) {
      this.lastCommand.undo();
      this.redoHistory.push(this.lastCommand);
      this.lastExecutionTitle = undefined;
      this.lastCommand = undefined;
    } else if (this.history.length > 0) {
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
    this.previousValue = { ...latest.previousValue,  ...this.previousValue };
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
    this.previousValue = [...latest.previousValue!, ...this.previousValue!];
    this.newValues = { ...this.newValues, ...latest.newValues };
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
