import { makeAutoObservable } from "mobx";
import { AddKeyframe, UpdateInstancesPropertiesExtended } from "@core/Command";
import { MainApp, getAppStores } from "@core/MainApp";
import { Path, Segment, SpeedKeyframe } from "@core/Path";
import { makeId } from "@core/Util";
import { GeneralConfig, convertFormat } from "../Config";
import { Quantity, UnitConverter, UnitOfLength } from "@core/Unit";
import { Format } from "../Format";
import { PointCalculationResult, getPathPoints } from "@core/Calculation";
import { SmartBuffer } from "smart-buffer";
import { GeneralConfigImpl } from "./GeneralConfig";
import { UserInterface } from "@core/Layout";
import { PathConfigImpl, PathConfigPanel } from "./PathConfig";
import { LemLibV1_0 } from "./Serialization";

// observable class
export class LemLibFormatV1_0 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  private readonly disposers: (() => void)[] = [];

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new LemLibFormatV1_0();
  }

  getName(): string {
    return "LemLib v1.0";
  }

  getDescription(): string {
    return "Path file for LemLib v1.0, using mm as the unit of length and m/s as the speed unit.";
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
          }
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

  convertFromFormat(oldFormat: Format, oldPaths: Path[]): Path[] {
    const newPaths = convertFormat(this, oldFormat, oldPaths);

    for (const path of newPaths) {
      path.name = path.name.replace(/[^\x00-\x7F]/g, ""); // eslint-disable-line no-control-regex
    }

    return newPaths;
  }

  createPath(...segments: Segment[]): Path {
    return new Path(new PathConfigImpl(this), ...segments);
  }

  getPathPoints(path: Path): PointCalculationResult {
    const uc = new UnitConverter(this.gc.uol, UnitOfLength.Inch);

    const result = getPathPoints(path, new Quantity(this.gc.pointDensity, this.gc.uol), {
      defaultFollowBentRate: true
    });
    const rate = (path.pc as PathConfigImpl).maxDecelerationRate;

    for (let i = result.points.length - 2; i >= 0; i--) {
      const last = result.points[i + 1];
      const current = result.points[i];

      // v = sqrt(v_0^2 + 2ad)
      const newSpeed = Math.sqrt(Math.pow(last.speed, 2) + 2 * rate * uc.fromAtoB(last.distance(current)));
      current.speed = Math.min(current.speed, newSpeed);
    }
    return result;
  }

  importPathsFromFile(buffer: ArrayBuffer): Path[] {
    throw new Error("Unable to import paths from this format, try other formats?");
  }

  importPDJDataFromFile(arrayBuffer: ArrayBuffer): Record<string, any> | undefined {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(arrayBuffer));

    try {
      const bodyBeginIdx = buffer.readOffset;
      buffer.readUInt8(); // Metadata size
      const sizeOfBody = buffer.readUInt32LE();

      buffer.readOffset = bodyBeginIdx + sizeOfBody;
      const signature = buffer.readStringNT();

      if (signature !== "#PATH.JERRYIO-DATA") return undefined;
    } catch (e) {
      return undefined;
    }

    const pathFileData = JSON.parse(buffer.readString());
    return pathFileData;
  }

  exportFile(): ArrayBuffer {
    const { app } = getAppStores();

    // ALGO: The implementation is adopted from https://github.com/LemLib/path under the MIT license.

    const buffer = SmartBuffer.fromSize(1024 * 10); // Initial size of 10KB

    LemLibV1_0.writePathFile(buffer, app.paths, app.exportPDJData());

    return buffer.toBuffer();
  }
}
