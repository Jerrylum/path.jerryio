import { makeAutoObservable, reaction, action, intercept } from "mobx";
import { Box, Typography, Slider } from "@mui/material";
import { Expose, Exclude, Type } from "class-transformer";
import { RangeSlider } from "../component/RangeSlider";
import { AddKeyframe, CancellableCommand, HistoryEventMap, UpdateProperties } from "../core/Command";
import { getAppStores } from "../core/MainApp";
import { Path, Segment, SpeedKeyframe } from "../core/Path";
import { EditableNumberRange, NumberRange, ValidateEditableNumberRange, ValidateNumber, makeId } from "../core/Util";
import { GeneralConfig, PathConfig, convertGeneralConfigUOL, convertPathConfigPointDensity } from "./Config";
import { IsPositive, IsBoolean, ValidateNested, IsObject } from "class-validator";
import { FieldImageSignatureAndOrigin, FieldImageOriginType, getDefaultBuiltInFieldImage } from "../core/Asset";
import { Quantity, UnitConverter, UnitOfLength } from "../core/Unit";
import { Format, PathFileData } from "./Format";
import { PointCalculationResult, fromDegreeToRadian, fromRadiansToDegree, getPathPoints } from "../core/Calculation";
import { SmartBuffer } from "smart-buffer";

export namespace LemLibV1_0 {
  export interface LemLibWaypoint {
    x: number; // mm
    y: number; // mm
    speed: number; // m/s
    heading?: number;
    lookahead?: number; // mm
  }

  export interface LemLibPathData {
    name: string;
    waypoints: LemLibWaypoint[];
  }

  export function writeWaypoint(buffer: SmartBuffer, waypoint: LemLibWaypoint) {
    let flag = 0;
    if (waypoint.heading !== undefined) flag |= 0x01;
    if (waypoint.lookahead !== undefined) flag |= 0x02;
    buffer.writeInt8(flag);
    buffer.writeInt16LE(Math.round(waypoint.x * 2));
    buffer.writeInt16LE(Math.round(waypoint.y * 2));
    buffer.writeInt16LE(Math.round(waypoint.speed * 1000));
    if (waypoint.heading !== undefined) {
      // From [0, 360) to [0~6.2832]
      const rad = fromDegreeToRadian(waypoint.heading);
      const rad2 = Math.max(0, Math.min(rad, 6.2832));
      buffer.writeUInt16LE(Math.round(rad2 * 10000));
    }
    if (waypoint.lookahead !== undefined) {
      buffer.writeInt16LE(Math.round(waypoint.lookahead * 2));
    }
  }

  export function readWaypoint(buffer: SmartBuffer): LemLibWaypoint {
    const flag = buffer.readInt8();
    const waypoint: LemLibWaypoint = {
      x: buffer.readInt16LE() / 2,
      y: buffer.readInt16LE() / 2,
      speed: buffer.readInt16LE() / 1000
    };
    if (flag & 0x01) {
      // From [0~6.2832] to [0, 360)
      const rad = buffer.readUInt16LE() / 10000;
      const deg = fromRadiansToDegree(rad);
      waypoint.heading = deg;
    }
    if (flag & 0x02) {
      waypoint.lookahead = buffer.readInt16LE() / 2;
    }
    if (flag & 0x04) buffer.readInt16LE(); // Reserved
    if (flag & 0x08) buffer.readInt16LE(); // Reserved
    if (flag & 0x10) buffer.readInt16LE(); // Reserved
    if (flag & 0x20) buffer.readInt16LE(); // Reserved
    if (flag & 0x40) buffer.readInt16LE(); // Reserved
    if (flag & 0x80) buffer.readInt16LE(); // Reserved

    return waypoint;
  }

  export function writePath(buffer: SmartBuffer, path: Path) {
    buffer.writeStringNT(path.name);
    buffer.writeInt8(0);
    // No metadata
    const result = path.pc.format.getPathPoints(path);
    const points = result.points;
    buffer.writeUInt16LE(points.length);
    points.forEach(point => {
      writeWaypoint(buffer, point);
    });
  }

  export function readPath(buffer: SmartBuffer): LemLibPathData {
    const name = buffer.readStringNT();
    const metadataSize = buffer.readInt8();
    if (metadataSize > 0) {
      buffer.readBuffer(metadataSize);
    }
    const numPoints = buffer.readUInt16LE();
    const waypoints: LemLibWaypoint[] = [];
    for (let i = 0; i < numPoints; i++) {
      waypoints.push(readWaypoint(buffer));
    }
    return { name, waypoints };
  }

  export function writePathFile(buffer: SmartBuffer, paths: Path[], pathFileData: Record<string, any>) {
    const bodyBeginIdx = buffer.writeOffset;
    buffer.writeUInt8(4); // Metadata size
    const metadataStartIdx = buffer.writeOffset;
    buffer.writeUInt32LE(0); // Placeholder

    buffer.writeUInt16LE(paths.length);
    paths.forEach(path => {
      writePath(buffer, path);
    });

    // The first 4 bytes of metadata is the pointer to the end of the body
    // The reader will use this pointer to skip the body and read the PATH.JERRYIO-DATA metadata
    const sizeOfBody = buffer.writeOffset - bodyBeginIdx;
    buffer.writeUInt32LE(sizeOfBody, metadataStartIdx);
    buffer.writeStringNT("#PATH.JERRYIO-DATA");
    buffer.writeString(JSON.stringify(pathFileData));
  }

  export function readPathFile(
    buffer: SmartBuffer
  ): { paths: LemLibPathData[]; pathFileData: Record<string, any> } | undefined {
    const bodyBeginIdx = buffer.readOffset;
    const metadataSize = buffer.readUInt8();
    const metadataStartIdx = buffer.readOffset;
    const metadataEndIdx = metadataStartIdx + metadataSize;
    const sizeOfBody = buffer.readUInt32LE();
    buffer.readOffset = metadataEndIdx;

    const paths: LemLibPathData[] = [];
    const numPaths = buffer.readUInt16LE();
    for (let i = 0; i < numPaths; i++) {
      paths.push(readPath(buffer));
    }

    buffer.readOffset = bodyBeginIdx + sizeOfBody;
    const signature = buffer.readStringNT();
    if (signature !== "#PATH.JERRYIO-DATA") return undefined;

    try {
      const pathFileData = JSON.parse(buffer.readString());
      return { paths, pathFileData };
    } catch (e) {
      return undefined;
    }
  }
}

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
  @Exclude()
  readonly lookaheadLimit: NumberRange = {
    from: 10,
    to: 1000
  };

  @ValidateEditableNumberRange(-Infinity, Infinity)
  @Expose()
  speedLimit: EditableNumberRange = {
    minLimit: { value: 0, label: "0" },
    // maxLimit: { value: 32.767, label: "32.767" },
    maxLimit: { value: 10, label: "10" },
    step: 0.05,
    from: 0.5,
    to: 1.0
  };
  @ValidateEditableNumberRange(-Infinity, Infinity)
  @Expose()
  bentRateApplicableRange: EditableNumberRange = {
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
        {/* TODO show button to show Lookahead Graph */}
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
      } else if (event.isCommandInstanceOf(UpdateProperties)) {
        const target = event.command.target;
        const newValues = event.command.newValues;
        if (target instanceof Path && "name" in newValues) {
          newValues.name = newValues.name.replace(/[^\x00-\x7F]/g, ""); // ascii only
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
