import { makeAutoObservable, reaction, action, intercept } from "mobx";
import { getAppStores } from "../core/MainApp";
import { ValidateNumber, makeId } from "../core/Util";
import { Path, Segment, Vector } from "../core/Path";
import { UnitOfLength, UnitConverter, Quantity } from "../core/Unit";
import { GeneralConfig, PathConfig, convertGeneralConfigUOL } from "./Config";
import { Format, PathFileData } from "./Format";
import { NumberRange, ValidateNumberRange } from "../component/RangeSlider";
import { Exclude, Expose, Type } from "class-transformer";
import { IsBoolean, IsObject, IsPositive, ValidateNested } from "class-validator";
import {
  PointCalculationResult,
  fromHeadingInDegreeToAngleInRadian,
  getPathPoints,
  getDiscretePoints,
  fromDegreeToRadian
} from "../core/Calculation";
import { FieldImageOriginType, FieldImageSignatureAndOrigin, getDefaultBuiltInFieldImage } from "../core/Asset";
import { CancellableCommand, HistoryEventMap, UpdateProperties } from "../core/Command";
import { ObserverInput } from "../component/ObserverInput";
import { Box, Typography } from "@mui/material";
import { euclideanRotation } from "../core/Coordinate";

// observable class
class GeneralConfigImpl implements GeneralConfig {
  @IsPositive()
  @Expose()
  robotWidth: number = 12;
  @IsPositive()
  @Expose()
  robotHeight: number = 12;
  @IsBoolean()
  @Expose()
  robotIsHolonomic: boolean = false;
  @IsBoolean()
  @Expose()
  showRobot: boolean = false;
  @ValidateNumber(num => num > 0 && num <= 1000) // Don't use IsEnum
  @Expose()
  uol: UnitOfLength = UnitOfLength.Inch;
  @IsPositive()
  @Expose()
  pointDensity: number = 2; // inches
  @IsPositive()
  @Expose()
  controlMagnetDistance: number = 5 / 2.54;
  @Type(() => FieldImageSignatureAndOrigin)
  @ValidateNested()
  @IsObject()
  @Expose()
  fieldImage: FieldImageSignatureAndOrigin<FieldImageOriginType> =
    getDefaultBuiltInFieldImage().getSignatureAndOrigin();
  @Expose()
  chassisName: string = "chassis";
  @Expose()
  movementTimeout: number = 5000;
  @Exclude()
  private format_: LemLibOdomGeneratorFormatV0_1;

  constructor(format: LemLibOdomGeneratorFormatV0_1) {
    this.format_ = format;
    makeAutoObservable(this);

    reaction(
      () => this.uol,
      action((_: UnitOfLength, oldUOL: UnitOfLength) => {
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
    const { app } = getAppStores();
    return (
      <>
        <Box className="panel-box">
          <Typography sx={{ marginTop: "16px" }}>Export Settings</Typography>
          <Box className="flex-editor-panel">
          <ObserverInput
            label="Chassis Name"
            getValue={() => this.chassisName}
            setValue={(value: string) => {
              app.history.execute(
                `Change chassis variable name`,
                new UpdateProperties(this as any, { chassisName: value })
              );
            }}
            isValidIntermediate={() => true}
            isValidValue={(candidate: string) => candidate !== ""}
            sx={{ marginTop: "16px" }}
          />
          <ObserverInput
            label="Movement Timeout"
            getValue={() => this.movementTimeout.toString() }
            setValue={(value: string) => {
              const parsedValue = parseInt(value)!;
              app.history.execute(
                `Change default movement timeout`,
                new UpdateProperties(this as any, { movementTimeout: parsedValue })
              );
            }}
            isValidIntermediate={() => true}
            isValidValue={(candidate: string) => parseInt(candidate) !== undefined}
            sx={{ marginTop: "16px" }}
          />
          </Box>
        </Box>
      </>
    );
  }
}

// observable class
class PathConfigImpl implements PathConfig {
  @ValidateNumberRange(-Infinity, Infinity)
  @Expose()
  speedLimit: NumberRange = {
    minLimit: { value: 0, label: "" },
    maxLimit: { value: 0, label: "" },
    step: 0,
    from: 0,
    to: 0
  };
  @ValidateNumberRange(-Infinity, Infinity)
  @Expose()
  bentRateApplicableRange: NumberRange = {
    minLimit: { value: 0, label: "" },
    maxLimit: { value: 0, label: "" },
    step: 0,
    from: 0,
    to: 0
  };
  @ValidateNumber(num => num >= 0.1 && num <= 255)
  @Expose()
  maxDecelerationRate: number = 127;

  @Exclude()
  readonly format: LemLibOdomGeneratorFormatV0_1;

  @Exclude()
  public path!: Path;

  constructor(format: LemLibOdomGeneratorFormatV0_1) {
    this.format = format;
    makeAutoObservable(this);
  }

  getConfigPanel() {
    return <></>;
  }
}

// observable class
export class LemLibOdomGeneratorFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);
  private readonly events = new Map<keyof HistoryEventMap<CancellableCommand>, Set<Function>>();

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new LemLibOdomGeneratorFormatV0_1();
  }

  getName(): string {
    return "LemLib Odometry Code Generator v0.4.x (inch coordinates)";
  }

  init(): void {
    if (this.isInit) return;
    this.isInit = true;
  }

  getGeneralConfig(): GeneralConfig {
    return this.gc;
  }

  createPath(...segments: Segment[]): Path {
    return new Path(new PathConfigImpl(this), ...segments);
  }

  getPathPoints(path: Path): PointCalculationResult {
    const result = getPathPoints(path, new Quantity(this.gc.pointDensity, this.gc.uol));
    return result;
  }

  recoverPathFileData(_: string): PathFileData {
    throw new Error("Loading paths is not supported in this format");
  }

  exportPathFile(): string {
    const { app } = getAppStores();

    let rtn = "";
    const gc = app.gc as GeneralConfigImpl;

    const path = app.interestedPath();
    if (path === undefined) throw new Error("No path to export");
    if (path.segments.length === 0) throw new Error("No segment to export");

    const uc = new UnitConverter(this.gc.uol, UnitOfLength.Inch);
    const points = getDiscretePoints(path);

    if (points.length > 0) {
      const start = points[0];
      let heading = 0;

      if (start.heading !== undefined) {
        heading = fromDegreeToRadian(start.heading);
      }

      // ALGO: Offsets to convert the absolute coordinates to the relative coordinates LemLib uses
      const offsets = new Vector(start.x, start.y);
      for (const point of points) {
        // ALGO: Only coordinate points are supported in LemLibOdom format
        const relative = euclideanRotation(heading, point.subtract(offsets));
        rtn += `${gc.chassisName}.moveTo(${uc.fromAtoB(relative.x).toUser()}, ${uc.fromAtoB(relative.y).toUser()}, ${gc.movementTimeout});\n`;
      }
    }
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
