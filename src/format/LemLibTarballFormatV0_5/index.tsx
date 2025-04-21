import { makeAutoObservable } from "mobx";
import { MainApp, getAppStores } from "@core/MainApp";
import { clamp, makeId } from "@core/Util";
import { Control, EndControl, Path, Segment, SpeedKeyframe } from "@core/Path";
import { UnitOfLength, UnitConverter, Quantity } from "@core/Unit";
import { GeneralConfig, convertFormat } from "../Config";
import { Format, importPDJDataFromTextFile } from "../Format";
import { AddKeyframe, UpdateInstancesPropertiesExtended } from "@core/Command";
import { PointCalculationResult, getPathPoints } from "@core/Calculation";
import { GeneralConfigImpl } from "./GeneralConfig";
import { PathConfigImpl, PathConfigPanel } from "./PathConfig";
import { UserInterface } from "@core/Layout";
import { enqueueInfoSnackbar } from "@src/app/Notice";
import { Logger } from "@src/core/Logger";
import { LemLibFormatV0_4 } from "../LemLibFormatV0_4";
import { PathConfigImpl as LemLibFormatV0_4PathConfigImpl } from "../LemLibFormatV0_4/PathConfig";

const logger = Logger("LemLibTarballFormatV0_5");

// observable class
export class LemLibTarballFormatV0_5 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  private readonly disposers: (() => void)[] = [];

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new LemLibTarballFormatV0_5();
  }

  getName(): string {
    return "LemLib Tarball v0.5";
  }

  getDescription(): string {
    return "Multiple paths supported format for LemLib v0.5 or higher, using 0 to 127 as the speed unit."; // TODO
  }

  register(app: MainApp, ui: UserInterface): void {
    if (this.isInit) return;
    this.isInit = true;

    type PatchWithName = { name: string };
    const isUpdatePathName = function (target: unknown, patch: Partial<unknown>): patch is PatchWithName {
      return target instanceof Path && "name" in patch;
    };

    this.disposers.push(
      app.history.addEventListener("beforeExecution", event => {
        if (event.isCommandInstanceOf(AddKeyframe)) {
          const keyframe = event.command.keyframe;
          if (keyframe instanceof SpeedKeyframe) {
            keyframe.followBentRate = true;
          } else if (event.isCommandInstanceOf(UpdateInstancesPropertiesExtended)) {
            const targets = event.command.targets;
            const newValues = event.command.newValues;
            newValues.forEach((value, idx) => {
              const target = targets[idx];
              if (isUpdatePathName(target, value)) {
                value.name = value.name.replace(/[^\x00-\x7F]/g, ""); // eslint-disable-line no-control-regex
              }
            });
          }
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
    const uc = new UnitConverter(this.gc.uol, UnitOfLength.Inch);

    const result = getPathPoints(path, new Quantity(this.gc.pointDensity, this.gc.uol), {
      defaultFollowBentRate: true
    });

    const pc = path.pc as PathConfigImpl;
    const rate = pc.maxDecelerationRate;
    const minSpeed = pc.speedLimit.from;

    if (result.points.length > 1) {
      // the speed of the final point should always be 0
      // set the speed of the segment end point to 0
      result.points[result.points.length - 2].speed = 0;
    }

    for (let i = result.points.length - 3; i >= 0; i--) {
      const last = result.points[i + 1];
      const current = result.points[i];

      // v = sqrt(v_0^2 + 2ad)
      const newSpeed = Math.sqrt(Math.pow(last.speed, 2) + 2 * rate * uc.fromAtoB(last.distance(current)));
      current.speed = Math.max(Math.min(current.speed, newSpeed), minSpeed);
    }
    return result;
  }

  convertFromFormat(oldFormat: Format, oldPaths: Path[]): Path[] {
    const { confirmation } = getAppStores();
    confirmation.prompt({
      title: "LemLib Tarball Format",
      description: (
        <p>
          This format requires installing{" "}
          <a href="https://github.com/jerrylum/LemLibTarball" target="_blank" rel="noreferrer">
            LemLib Tarball
          </a>{" "}
          depot together with LemLib. Please see the{" "}
          <a href="https://docs.path.jerryio.com/docs/formats/LemLibTarballFormatV0_5" target="_blank" rel="noreferrer">
            documentation
          </a>{" "}
          for more information.
        </p>
      ),
      buttons: [{ label: "OK" }]
    });

    const newPaths = convertFormat(this, oldFormat, oldPaths);

    for (const path of newPaths) {
      path.name = path.name.replace(/[^\x00-\x7F]/g, ""); // eslint-disable-line no-control-regex
    }

    if (oldFormat instanceof LemLibFormatV0_4) {
      // ALGO: the speed unit is 0 to 127, convert it to 0 to 255
      for (let i = 0; i < newPaths.length; i++) {
        const oldPathConfig = oldPaths[i].pc as LemLibFormatV0_4PathConfigImpl;
        const newPathConfig = newPaths[i].pc as PathConfigImpl;
        newPathConfig.speedLimit = oldPathConfig.speedLimit;
        newPathConfig.bentRateApplicableRange = oldPathConfig.bentRateApplicableRange;
        newPathConfig.maxDecelerationRate = oldPathConfig.maxDecelerationRate;
      }
    }

    return newPaths;
  }

  importPathsFromFile(buffer: ArrayBuffer): Path[] {
    // ALGO: The implementation is adopted from https://github.com/LemLib/Path-Gen under the GPLv3 license.

    const fileContent = new TextDecoder().decode(buffer);

    const paths: Path[] = [];

    // find the first line that is "endData"
    const lines = fileContent.split("\n");

    let i = lines.findIndex(line => line.trim() === "endData");
    if (i === -1) throw new Error("Invalid file format, unable to find line 'endData'");

    const maxDecelerationRate = Number(lines[i + 1]);
    if (isNaN(maxDecelerationRate)) throw new Error("Invalid file format, unable to parse max deceleration rate");

    const maxSpeed = Number(lines[i + 2]);
    if (isNaN(maxSpeed)) throw new Error("Invalid file format, unable to parse max speed");

    // i + 3 Multiplier not supported.

    i += 4;

    const error = () => {
      throw new Error("Invalid file format, unable to parse segment at line " + (i + 1));
    };

    const num = (str: string): number => {
      const num = Number(str);
      if (isNaN(num)) error();
      return num; // ALGO: removed fix precision
    };

    const push = (segment: Segment) => {
      // check if there is a path
      if (paths.length === 0) {
        const path = this.createPath(segment);
        path.pc.speedLimit.to = clamp(
          maxSpeed.toUser(),
          path.pc.speedLimit.minLimit.value,
          path.pc.speedLimit.maxLimit.value
        );
        (path.pc as PathConfigImpl).maxDecelerationRate = maxDecelerationRate;
        paths.push(path);
      } else {
        const path = paths[paths.length - 1];
        const lastSegment = path.segments[path.segments.length - 1];
        const a = lastSegment.last;
        const b = segment.first;

        if (a.x !== b.x || a.y !== b.y) error();

        path.segments.push(segment);
      }
    };

    while (i < lines.length - 1) {
      // ALGO: the last line is always empty, follow the original implementation.
      const line = lines[i];
      const tokens = line.split(", ");
      if (tokens.length !== 8) error();

      const p1 = new EndControl(num(tokens[0]), num(tokens[1]), 0);
      const p2 = new Control(num(tokens[2]), num(tokens[3]));
      const p3 = new Control(num(tokens[4]), num(tokens[5]));
      const p4 = new EndControl(num(tokens[6]), num(tokens[7]), 0);
      const segment = new Segment(p1, p2, p3, p4);
      push(segment);

      i++;
    }

    return paths;
  }

  importPDJDataFromFile(buffer: ArrayBuffer): Record<string, any> | undefined {
    return importPDJDataFromTextFile(buffer);
  }

  exportFile(): ArrayBufferView<ArrayBufferLike> {
    const { app } = getAppStores();

    // ALGO: The implementation is adopted from https://github.com/LemLib/Path-Gen under the GPLv3 license.

    let fileContent = "";
    const uc = new UnitConverter(this.gc.uol, UnitOfLength.Inch);

    let ignoredPaths: string[] = [];

    for (const path of app.paths) {
      if (path.segments.length === 0) {
        ignoredPaths.push(path.name);
        continue;
      }

      const points = this.getPathPoints(path).points;

      if (points.length < 3) {
        ignoredPaths.push(path.name);
        continue;
      }

      fileContent += `#PATH-POINTS-START ${path.name}\n`;

      for (const point of points) {
        // ALGO: heading is not supported in LemLib V0.4 format.
        fileContent += `${uc.fromAtoB(point.x).toUser()}, ${uc.fromAtoB(point.y).toUser()}, ${point.speed.toUser()}\n`;
      }

      /*
      Here is the original code of how the ghost point is calculated:

      ```cpp
      // create a "ghost point" at the end of the path to make stopping nicer
      const lastPoint = path.points[path.points.length-1];
      const lastControl = path.segments[path.segments.length-1].p2;
      const ghostPoint = Vector.interpolate(Vector.distance(lastControl, lastPoint) + 20, lastControl, lastPoint);
      ```

      Notice that the variable "lastControl" is not the last control point, but the second last control point.
      This implementation is different from the original implementation by using the last point and the second last point.
      */
      // ALGO: use second and third last points, since first and second last point are always identical
      const last2 = points[points.length - 3]; // third last point, last point by the calculation
      const last1 = points[points.length - 2]; // second last point, also the last control point
      // ALGO: The 20 inches constant is a constant value in the original LemLib-Path-Gen implementation.
      const ghostPoint = last2.interpolate(last1, last2.distance(last1) + uc.fromBtoA(20));
      fileContent += `${uc.fromAtoB(ghostPoint.x).toUser()}, ${uc.fromAtoB(ghostPoint.y).toUser()}, 0\n`;

      fileContent += `endData\n`;
    }

    fileContent += "#PATH.JERRYIO-DATA " + JSON.stringify(app.exportPDJData());

    if (ignoredPaths.length > 0) {
      enqueueInfoSnackbar(
        logger,
        `Some path(s) are not exported because they are too short: ${ignoredPaths.join(", ")}`,
        5000
      );
    }

    return new TextEncoder().encode(fileContent);
  }
}
