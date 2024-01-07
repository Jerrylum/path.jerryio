import { makeAutoObservable } from "mobx";
import { getAppStores } from "../core/MainApp";
import { EditableNumberRange, ValidateEditableNumberRange, ValidateNumber, makeId } from "../core/Util";
import { Quantity, UnitConverter, UnitOfLength } from "../core/Unit";
import { GeneralConfig, PathConfig, convertFormat, initGeneralConfig } from "./Config";
import { Format, importPDJDataFromTextFile } from "./Format";
import { RangeSlider } from "../component/RangeSlider";
import { Box, Typography } from "@mui/material";
import { CancellableCommand, HistoryEventMap, UpdateProperties } from "../core/Command";
import { Exclude, Expose, Type } from "class-transformer";
import { IsBoolean, IsObject, IsPositive, ValidateNested } from "class-validator";
import { PointCalculationResult, getPathPoints } from "../core/Calculation";
import { BentRateApplicationDirection, Path, Segment } from "../core/Path";
import { isCoordinateWithHeading } from "../core/Coordinate";
import { FieldImageOriginType, FieldImageSignatureAndOrigin, getDefaultBuiltInFieldImage } from "../core/Asset";

// observable class
class GeneralConfigImpl implements GeneralConfig {
  @IsPositive()
  @Expose()
  robotWidth: number = 30;
  @IsPositive()
  @Expose()
  robotHeight: number = 30;
  @IsBoolean()
  @Expose()
  robotIsHolonomic: boolean = false;
  @IsBoolean()
  @Expose()
  showRobot: boolean = false;
  @ValidateNumber(num => num > 0 && num <= 1000) // Don't use IsEnum
  @Expose()
  uol: UnitOfLength = UnitOfLength.Centimeter;
  @IsPositive()
  @Expose()
  pointDensity: number = 2;
  @IsPositive()
  @Expose()
  controlMagnetDistance: number = 5;
  @Type(() => FieldImageSignatureAndOrigin)
  @ValidateNested()
  @IsObject()
  @Expose()
  fieldImage: FieldImageSignatureAndOrigin<FieldImageOriginType> =
    getDefaultBuiltInFieldImage().getSignatureAndOrigin();

  @Exclude()
  private format_: PathDotJerryioFormatV0_1;

  constructor(format: PathDotJerryioFormatV0_1) {
    this.format_ = format;
    makeAutoObservable(this);

    initGeneralConfig(this);
  }

  get format() {
    return this.format_;
  }

  getConfigPanel() {
    return <></>;
  }
}

// observable class
class PathConfigImpl implements PathConfig {
  @ValidateEditableNumberRange(-Infinity, Infinity)
  @Expose()
  speedLimit: EditableNumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 600, label: "600" },
    step: 1,
    from: 40,
    to: 120
  };
  @ValidateEditableNumberRange(-Infinity, Infinity)
  @Expose()
  bentRateApplicableRange: EditableNumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 1, label: "1" },
    step: 0.001,
    from: 0,
    to: 0.1
  };
  @Exclude()
  bentRateApplicationDirection = BentRateApplicationDirection.HighToLow;
  @Exclude()
  readonly format: PathDotJerryioFormatV0_1;

  @Exclude()
  public path!: Path;

  constructor(format: PathDotJerryioFormatV0_1) {
    this.format = format;
    makeAutoObservable(this);
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
      </>
    );
  }
}

// observable class
export class PathDotJerryioFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);
  private readonly events = new Map<keyof HistoryEventMap<CancellableCommand>, Set<Function>>();

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new PathDotJerryioFormatV0_1();
  }

  getName(): string {
    return "path.jerryio v0.1.x (cm, rpm)";
  }

  register(app: MainApp): void {
    if (this.isInit) return;
    this.isInit = true;
  }

  unregister(app: MainApp): void {}

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
    return convertFormat(this, oldFormat, oldPaths);
  }

  importPathsFromFile(buffer: ArrayBuffer): Path[] {
    throw new Error("Unable to import paths from this format, try other formats?");
  }

  importPDJDataFromFile(buffer: ArrayBuffer): Record<string, any> | undefined {
    return importPDJDataFromTextFile(buffer);
  }

  exportFile(): ArrayBuffer {
    const { app } = getAppStores();

    let fileContent = "";

    const uc = new UnitConverter(app.gc.uol, UnitOfLength.Centimeter);
    const density = new Quantity(app.gc.pointDensity, app.gc.uol);

    for (const path of app.paths) {
      fileContent += `#PATH-POINTS-START ${path.name}\n`;

      const points = getPathPoints(path, density).points;

      for (const point of points) {
        const x = uc.fromAtoB(point.x).toUser();
        const y = uc.fromAtoB(point.y).toUser();
        if (isCoordinateWithHeading(point)) fileContent += `${x},${y},${point.speed.toUser()},${point.heading}\n`;
        else fileContent += `${x},${y},${point.speed.toUser()}\n`;
      }
    }

    fileContent += "#PATH.JERRYIO-DATA " + JSON.stringify(app.exportPDJData());

    return new TextEncoder().encode(fileContent);
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
