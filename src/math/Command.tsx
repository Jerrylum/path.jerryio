
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
  private previousValue?: Partial<Record<keyof (TTarget), any>>;

  constructor(private target: TTarget, private newValues: Partial<Record<keyof (TTarget), any>>) { }

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

  private updateProperties(values: Partial<Record<keyof (TTarget), any>>): Partial<Record<keyof (TTarget), any>> {
    const target = this.target;

    const previousValues: Partial<Record<keyof (TTarget), any>> = {} as Partial<Record<keyof (TTarget), any>>;
    for (const key in values) {
      previousValues[key] = target[key];
      target[key] = values[key];
    }

    return previousValues;
  }

}
