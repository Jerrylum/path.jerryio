import { makeAutoObservable, reaction, action, intercept } from "mobx";
import { Box, Typography, Slider } from "@mui/material";
import { Expose, Exclude, Type } from "class-transformer";
import { ValidateNumberRange, NumberRange, RangeSlider } from "../component/RangeSlider";
import { AddKeyframe, CancellableCommand, HistoryEventMap, UpdateProperties } from "../core/Command";
import { getAppStores } from "../core/MainApp";
import { Control, EndControl, Path, Point, Segment, SpeedKeyframe, Vector } from "../core/Path";
import { ValidateNumber, clamp, makeId } from "../core/Util";
import { GeneralConfig, PathConfig, convertGeneralConfigUOL, convertPathConfigPointDensity } from "./Config";
import { IsPositive, IsBoolean, ValidateNested, IsObject } from "class-validator";
import { FieldImageSignatureAndOrigin, FieldImageOriginType, getDefaultBuiltInFieldImage } from "../core/Asset";
import { Quantity, UnitConverter, UnitOfLength } from "../core/Unit";
import { Format, PathFileData } from "./Format";
import { PointCalculationResult, getPathPoints } from "../core/Calculation";
import { SmartBuffer } from "smart-buffer";

export interface LemLibWaypoint {
  x: number;
  y: number;
  speed: number;
  heading?: number;
  lookahead?: number;
}

export function writeWaypoint(buffer: SmartBuffer, waypoint: LemLibWaypoint) {
  
}

// export function readWaypoint(buffer: SmartBuffer): LemLibWaypoint {

// }

export interface LemLibPathConfig extends PathConfig {}

// observable class
class GeneralConfigImpl implements GeneralConfig {
  @IsPositive()
  @Expose()
  robotWidth: number = 300;
  @IsPositive()
  @Expose()
  robotHeight: number = 300;
  @IsBoolean()
  @Expose()
  robotIsHolonomic: boolean = false;
  @IsBoolean()
  @Expose()
  showRobot: boolean = false;
  @ValidateNumber(num => num > 0 && num <= 1000) // Don't use IsEnum
  @Expose()
  uol: UnitOfLength = UnitOfLength.Millimeter;
  @IsPositive()
  @Expose()
  pointDensity: number = 10; // inches
  @IsPositive()
  @Expose()
  controlMagnetDistance: number = 50;
  @Type(() => FieldImageSignatureAndOrigin)
  @ValidateNested()
  @IsObject()
  @Expose()
  fieldImage: FieldImageSignatureAndOrigin<FieldImageOriginType> =
    getDefaultBuiltInFieldImage().getSignatureAndOrigin();

  @Exclude()
  private format_: LemLibFormatV1_0;

  constructor(format: LemLibFormatV1_0) {
    this.format_ = format;
    makeAutoObservable(this);

    reaction(
      () => this.uol,
      action((newUOL: UnitOfLength, oldUOL: UnitOfLength) => {
        convertGeneralConfigUOL(this, oldUOL);
      })
    );

    intercept(this, "fieldImage", change => {
      const { assetManager } = getAppStores();

      if (assetManager.getAssetBySignature(change.newValue.signature) === undefined) {
        change.newValue = getDefaultBuiltInFieldImage().getSignatureAndOrigin();
      }

      return change;
    });
  }

  get format() {
    return this.format_;
  }

  getConfigPanel() {
    return <></>;
  }
}

// observable class
class PathConfigImpl implements LemLibPathConfig {
  @ValidateNumberRange(-Infinity, Infinity)
  @Expose()
  speedLimit: NumberRange = {
    minLimit: { value: 0, label: "0" },
    // maxLimit: { value: 32.767, label: "32.767" },
    maxLimit: { value: 10, label: "10" },
    step: 0.05,
    from: 0.5,
    to: 1.0
  };
  @ValidateNumberRange(-Infinity, Infinity)
  @Expose()
  bentRateApplicableRange: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 50, label: "50" },
    step: 1,
    from: 14,
    to: 18
  };
  @ValidateNumber(num => num >= 0.05 && num <= 10)
  @Expose()
  maxDecelerationRate: number = 1;

  @Exclude()
  readonly format: LemLibFormatV1_0;

  @Exclude()
  public path!: Path;

  constructor(format: LemLibFormatV1_0) {
    this.format = format;
    makeAutoObservable(this);

    reaction(
      () => format.getGeneralConfig().pointDensity,
      action((val: number, oldVal: number) => {
        convertPathConfigPointDensity(this, oldVal, val);
      })
    );

    // ALGO: Convert the default parameters to the current point density
    // ALGO: This is only used when a new path is added, not when the path config is loaded
    // ALGO: When loading path config, the configuration will be set/overwritten after this constructor
    convertPathConfigPointDensity(this, 2, format.getGeneralConfig().pointDensity);
  }

  getConfigPanel() {
    const { app } = getAppStores();

    return (
      <>
        <Box className="panel-box">
          <Typography>Min/Max Speed</Typography>
          <RangeSlider
            range={this.speedLimit}
            onChange={(from, to) =>
              app.history.execute(
                `Change path ${this.path.uid} min/max speed`,
                new UpdateProperties(this.speedLimit, { from, to })
              )
            }
          />
        </Box>
        <Box className="panel-box">
          <Typography>Bent Rate Applicable Range</Typography>
          <RangeSlider
            range={this.bentRateApplicableRange}
            onChange={(from, to) =>
              app.history.execute(
                `Change path ${this.path.uid} bent rate applicable range`,
                new UpdateProperties(this.bentRateApplicableRange, { from, to })
              )
            }
          />
        </Box>
        <Box className="panel-box">
          <Typography>Max Deceleration Rate</Typography>
          <Slider
            step={0.1}
            valueLabelDisplay="auto"
            value={[this.maxDecelerationRate]}
            min={0.1}
            max={255}
            onChange={action((event, value) => {
              if (Array.isArray(value)) value = value[0];
              app.history.execute(
                `Change path ${this.path.uid} max deceleration rate`,
                new UpdateProperties(this as any, { maxDecelerationRate: value })
              );
            })}
          />
        </Box>
      </>
    );
  }
}

// observable class
export class LemLibFormatV1_0 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);
  private readonly events = new Map<keyof HistoryEventMap<CancellableCommand>, Set<Function>>();

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new LemLibFormatV1_0();
  }

  getName(): string {
    return "LemLib v1.0.0 (mm, m/s)";
  }

  init(): void {
    if (this.isInit) return;
    this.isInit = true;

    this.addEventListener("beforeExecution", event => {
      if (event.isCommandInstanceOf(AddKeyframe)) {
        const keyframe = event.command.keyframe;
        if (keyframe instanceof SpeedKeyframe) {
          keyframe.followBentRate = true;
        }
      }
    });
  }

  getGeneralConfig(): GeneralConfig {
    return this.gc;
  }

  createPath(...segments: Segment[]): Path {
    return new Path(new PathConfigImpl(this), ...segments);
  }

  getPathPoints(path: Path): PointCalculationResult {
    const uc = new UnitConverter(this.gc.uol, UnitOfLength.Inch);

    const result = getPathPoints(path, new Quantity(this.gc.pointDensity, this.gc.uol));
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

  recoverPathFileData(fileContent: string): PathFileData {
    throw new Error("Unable to recover path file data from this format, try other formats?");
  }

  exportPathFile(): string {
    const { app } = getAppStores();

    // ALGO: The implementation is adopted from https://github.com/LemLib/path under the MIT license.

    let rtn = "";

    // TODO

    rtn += "#PATH.JERRYIO-DATA " + JSON.stringify(app.exportPathFileData());

    return rtn;
  }

  addEventListener<K extends keyof HistoryEventMap<CancellableCommand>, T extends CancellableCommand>(
    type: K,
    listener: (event: HistoryEventMap<T>[K]) => void
  ): void {
    if (!this.events.has(type)) this.events.set(type, new Set());
    this.events.get(type)!.add(listener);
  }

  removeEventListener<K extends keyof HistoryEventMap<CancellableCommand>, T extends CancellableCommand>(
    type: K,
    listener: (event: HistoryEventMap<T>[K]) => void
  ): void {
    if (!this.events.has(type)) return;
    this.events.get(type)!.delete(listener);
  }

  fireEvent(
    type: keyof HistoryEventMap<CancellableCommand>,
    event: HistoryEventMap<CancellableCommand>[keyof HistoryEventMap<CancellableCommand>]
  ) {
    if (!this.events.has(type)) return;
    for (const listener of this.events.get(type)!) {
      listener(event);
    }
  }
}
