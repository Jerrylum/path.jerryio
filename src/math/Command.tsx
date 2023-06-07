import { MainApp } from "../app/MainApp";
import { UnitOfLength } from "./Unit";

export interface Command {
  execute(): void;
}

export interface CancellableCommand extends Command {
  undo(): void;
  redo(): void;
}

// export class ChangeUOLCommand implements CancellableCommand {
//   public oldUOL?: UnitOfLength;

//   constructor(public app: MainApp, public newUOL: UnitOfLength) {
//   }

//   execute(): void {
//     this.oldUOL = this.app.gc.uol;
//     this.app.gc.uol = this.newUOL;
//   }

//   undo(): void {
//     this.app.gc.uol = this.oldUOL!;
//   }

//   redo(): void {
//     this.execute();
//   }
// }

// export class ChangeDensityCommand implements CancellableCommand {
//   public oldDensity?: number;

//   constructor(public app: MainApp, public newDensity: number) {
//   }

//   execute(): void {
//     this.oldDensity = this.app.gc.pointDensity;
//     this.app.gc.pointDensity = this.newDensity;
//   }

//   undo(): void {
//     this.app.gc.pointDensity = this.oldDensity!;
//   }

//   redo(): void {
//     this.execute();
//   }
// }

export class UpdatePropertyCommand<TTarget> implements CancellableCommand {
  private previousValue?: any;

  constructor(private target: TTarget, private propertyName: keyof (TTarget), private newValue?: any) { }

  execute(): void {
    this.previousValue = this.updateProperty(this.newValue);
  }

  undo(): void {
    this.updateProperty(this.previousValue);
    this.previousValue = undefined;
  }

  redo(): void {
    this.execute();
  }

  private updateProperty(value?: any): any {
    const target = this.target;
    const key = this.propertyName;

    const currentValue = target[key];
    target[key] = value;
    return currentValue;
  }
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
