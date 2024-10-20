import { makeAutoObservable } from "mobx";
import { MainApp, getAppStores } from "@core/MainApp";
import { makeId } from "@core/Util";
import { Quantity } from "@core/Unit";
import { GeneralConfig, convertFormat } from "../Config";
import { Format, importPDJDataFromTextFile } from "../Format";
import {
  AddCubicSegment,
  AddKeyframe,
  AddLinearSegment,
  ConvertSegment,
  InsertControls,
  InsertPaths,
  UpdatePathTreeItems
} from "@core/Command";
import { PointCalculationResult, boundHeading, getPathPoints, toDerivativeHeading, toHeading } from "@core/Calculation";
import { EndControl, Path, Segment, SegmentVariant } from "@core/Path";
import { BackQuoteString, CodePointBuffer } from "@src/token/Tokens";
import { PathConfigImpl, PathConfigPanel } from "./PathConfig";
import { GeneralConfigImpl, HeadingOutputType } from "./GeneralConfig";
import { UserInterface } from "@core/Layout";

// observable class
export class RigidCodeGenFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  private readonly disposers: (() => void)[] = [];

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new RigidCodeGenFormatV0_1();
  }

  getName(): string {
    return "Rigid Code Gen v0.1";
  }

  getDescription(): string {
    return "Generates a sequence of movement commands for each point in the path with a specified template.";
  }

  register(app: MainApp, ui: UserInterface): void {
    if (this.isInit) return;
    this.isInit = true;

    const fixEndControlsHeading = () => {
      app.paths.forEach(path => {
        path.segments.forEach(segment => {
          const first = segment.first;
          const last = segment.last;
          const suggestedHeading = toHeading(last.subtract(first));
          const acceptableHeading1 = suggestedHeading;
          const acceptableHeading2 = boundHeading(suggestedHeading + 180);
          const currentHeading = first.heading;
          const delta1 = Math.abs(toDerivativeHeading(currentHeading, acceptableHeading1));
          const delta2 = Math.abs(toDerivativeHeading(currentHeading, acceptableHeading2));
          if (delta1 < delta2) first.heading = acceptableHeading1;
          else first.heading = acceptableHeading2;
          segment.speed.list.length = 0;
          segment.lookahead.list.length = 0;
        });
      });
    };

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
        } else if (event.isCommandInstanceOf(UpdatePathTreeItems)) {
          const targets = event.command.targets;
          const newValues = event.command.newValues;

          const isLastEndControlOfPath = (target: EndControl) => {
            return app.paths.some(path => path.segments.at(-1)?.last === target);
          };

          targets.forEach(target => {
            if (target instanceof EndControl) {
              const isChangingHeadingValue = "heading" in newValues && newValues.heading !== undefined;
              if (!isChangingHeadingValue) return;

              if (isLastEndControlOfPath(target)) return;

              const oldValue = target.heading;
              newValues.heading = boundHeading(oldValue + 180);
            }
          });
        } else if (event.isCommandInstanceOf(InsertPaths)) {
          event.command.inserting.forEach(path => {
            path.segments.forEach(segment => {
              segment.controls = [segment.first, segment.last];

              segment.first.heading = toHeading(segment.last.subtract(segment.first));
            });
          });
        } else if (event.isCommandInstanceOf(InsertControls)) {
          event.command.inserting = event.command.inserting.filter(control => control instanceof EndControl);
        } else if (event.isCommandInstanceOf(AddKeyframe)) {
          event.isCancelled = true;
        }
      }),
      app.history.addEventListener("merge", event => {
        fixEndControlsHeading();
      }),
      app.history.addEventListener("execute", event => {
        fixEndControlsHeading();
      }),
      app.history.addEventListener("afterUndo", event => {
        fixEndControlsHeading();
      }),
      app.history.addEventListener("afterRedo", event => {
        fixEndControlsHeading();
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
        segment.first.heading = toHeading(segment.last.subtract(segment.first));
        segment.speed.list.length = 0;
        segment.lookahead.list.length = 0;
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

  private exportRigidMovementCode(path: Path, templates: { [key: string]: string }) {
    let rtn = "";

    const gc = this.gc as GeneralConfigImpl;
    const pc = path.pc as PathConfigImpl;

    const startHeading = path.segments[0].first.heading;

    for (const segment of path.segments) {
      const first = segment.first;
      const last = segment.last;

      const distance = first.distance(last);

      const forwardHeading = toHeading(last.subtract(first));
      const movementTemplate = (first.heading === forwardHeading ? templates.forward : templates.backward) ?? "";
      const movementTemplateValues = {
        fromX: first.x.toUser(),
        fromY: first.y.toUser(),
        x: last.x.toUser(),
        y: last.y.toUser(),
        distance: distance.toUser(),
        speed: pc.speed
      };
      rtn += this.applyTemplate(movementTemplate, movementTemplateValues) + "\n";

      const nextHeading = last.heading;
      if (gc.headingOutputType === HeadingOutputType.Absolute) {
        rtn += this.applyTemplate(templates.turnTo ?? "", { heading: nextHeading.toUser(), speed: pc.speed }) + "\n";
      } else if (gc.headingOutputType === HeadingOutputType.Relative) {
        const deltaHeading = boundHeading(nextHeading - startHeading);
        rtn += this.applyTemplate(templates.turnTo ?? "", { heading: deltaHeading.toUser(), speed: pc.speed }) + "\n";
      } else {
        const deltaHeading = toDerivativeHeading(forwardHeading, nextHeading);
        if (deltaHeading > 0)
          rtn +=
            this.applyTemplate(templates.turnRight ?? "", { heading: deltaHeading.toUser(), speed: pc.speed }) + "\n";
        else if (deltaHeading < 0)
          rtn +=
            this.applyTemplate(templates.turnLeft ?? "", { heading: -deltaHeading.toUser(), speed: pc.speed }) + "\n";
      }
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
        code: this.exportRigidMovementCode(path, templates)
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
