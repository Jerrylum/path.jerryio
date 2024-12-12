import { makeAutoObservable } from "mobx";
import { MainApp, getAppStores } from "@core/MainApp";
import { makeId } from "@core/Util";
import { Quantity } from "@core/Unit";
import { GeneralConfig, convertFormat } from "../Config";
import { Format, importPDJDataFromTextFile } from "../Format";
import { AddCubicSegment, AddLinearSegment, ConvertSegment, InsertControls, InsertPaths } from "@core/Command";
import { PointCalculationResult, getPathPoints } from "@core/Calculation";
import { EndControl, Path, Segment, SegmentVariant } from "@core/Path";
import { BackQuoteString, CodePointBuffer } from "@token/Tokens";
import { UserInterface } from "@core/Layout";
import { PathConfigImpl, PathConfigPanel } from "./PathConfig";
import { GeneralConfigImpl } from "./GeneralConfig";

// observable class
export class MoveToPointCodeGenFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  private readonly disposers: (() => void)[] = [];

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new MoveToPointCodeGenFormatV0_1();
  }

  getName(): string {
    return "Move-to-Point Code Gen v0.1";
  }

  getDescription(): string {
    return "Generates a sequence of moveTo commands for each point in the path with a specified template.";
  }

  register(app: MainApp, ui: UserInterface): void {
    if (this.isInit) return;
    this.isInit = true;

    this.disposers.push(
      app.history.addEventListener("beforeExecution", event => {
        if (event.isCommandInstanceOf(AddCubicSegment)) {
          event.isCancelled = true;

          const cancelledCommand = event.command;
          app.history.execute(
            `Add linear segment with end control point ${cancelledCommand.end.uid} to path ${cancelledCommand.path.uid}`,
            new AddLinearSegment(cancelledCommand.path, cancelledCommand.end)
          );
        } else if (event.isCommandInstanceOf(ConvertSegment) && event.command.variant === SegmentVariant.Cubic) {
          event.isCancelled = true;
        } else if (event.isCommandInstanceOf(InsertPaths)) {
          event.command.inserting.forEach(path => {
            path.segments.forEach(segment => {
              segment.controls = [segment.first, segment.last];
            });
          });
        } else if (event.isCommandInstanceOf(InsertControls)) {
          event.command.inserting = event.command.inserting.filter(control => control instanceof EndControl);
        }
      }),
      ui.registerPanel(PathConfigPanel).disposer
    );
  }

  unregister(): void {
    this.disposers.forEach(disposer => disposer());
  }

  getGeneralConfig(): GeneralConfig {
    return this.gc;
  }

  createPath(...segments: Segment[]): Path {
    return new Path(new PathConfigImpl(this), ...segments);
  }

  getPathPoints(path: Path): PointCalculationResult {
    return getPathPoints(path, new Quantity(this.gc.pointDensity, this.gc.uol));
  }

  convertFromFormat(oldFormat: Format, oldPaths: Path[]): Path[] {
    const newPaths = convertFormat(this, oldFormat, oldPaths);
    newPaths.forEach(path => {
      path.segments.forEach(segment => {
        segment.controls = [segment.first, segment.last];
      });
      path.pc.speedLimit = {
        minLimit: { value: 0, label: "0" },
        maxLimit: { value: 1, label: "1" },
        step: 1,
        from: 0,
        to: 1
      };
      path.pc.bentRateApplicableRange = {
        minLimit: { value: 0, label: "0" },
        maxLimit: { value: 1, label: "1" },
        step: 0.001,
        from: 0,
        to: 1
      };
    });
    return newPaths;
  }

  importPathsFromFile(buffer: ArrayBuffer): Path[] {
    throw new Error("Unable to import paths from this format, try other formats?");
  }

  importPDJDataFromFile(buffer: ArrayBuffer): Record<string, any> | undefined {
    return importPDJDataFromTextFile(buffer);
  }

  private getTemplatesSet(): { [key: string]: string } {
    const template = this.gc.outputTemplate;
    const rtn: { [key: string]: string } = {};

    const cpb = new CodePointBuffer(template);

    while (cpb.hasNext()) {
      const key = cpb.readSafeChunk();
      const colon = cpb.next();

      if (key === "" || colon !== ":") {
        // skip this line
        while (cpb.hasNext() && cpb.next() !== "\n") {}
        continue;
      }

      cpb.readDelimiter();

      const value = BackQuoteString.parse(cpb);
      if (value === null) break;

      rtn[key] = value.content;

      // skip this line
      while (cpb.hasNext() && cpb.next() !== "\n") {}
    }

    return rtn;
  }

  private applyTemplate(template: string, values: { [key: string]: number | boolean | string }): string {
    return template.replace(/\${([^}]+)}/g, (_, key) => (values[key] ?? "") + "");
  }

  private exportHolonomicMovementCode(path: Path, templates: { [key: string]: string }) {
    let rtn = "";

    const pc = path.pc as PathConfigImpl;

    for (const segment of path.segments) {
      const last = segment.last;

      const nextHeading = last.heading;

      rtn +=
        this.applyTemplate(templates.moveToPoint ?? "", {
          x: last.x.toUser(),
          y: last.y.toUser(),
          heading: nextHeading.toUser(),
          speed: pc.speed
        }) + "\n";
    }

    return rtn;
  }

  exportCode(): string {
    const { app } = getAppStores();

    let rtn = "";

    const templates = this.getTemplatesSet();

    app.paths.forEach(path => {
      rtn += this.applyTemplate(templates.path ?? "", {
        name: path.name,
        code: this.exportHolonomicMovementCode(path, templates)
      });
    });

    return rtn;
  }

  exportFile(): ArrayBuffer {
    const { app } = getAppStores();

    let fileContent = this.exportCode();

    fileContent += "\n";

    fileContent += "#PATH.JERRYIO-DATA " + JSON.stringify(app.exportPDJData());

    return new TextEncoder().encode(fileContent);
  }
}
