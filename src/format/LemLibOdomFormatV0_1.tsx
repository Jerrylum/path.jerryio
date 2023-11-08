import { makeAutoObservable, reaction, action, intercept } from "mobx";
import { getAppStores } from "../core/MainApp";
import { ValidateNumber, makeId } from "../core/Util";
import { Path, Segment, Vector } from "../core/Path";
import { UnitOfLength, UnitConverter, Quantity } from "../core/Unit";
import { GeneralConfig, PathConfig, convertGeneralConfigUOL, convertPathConfigPointDensity } from "./Config";
import { Format, PathFileData } from "./Format";
import { NumberRange, ValidateNumberRange } from "../component/RangeSlider";
import { Exclude, Expose, Type } from "class-transformer";
import { IsBoolean, IsObject, IsPositive, ValidateNested } from "class-validator";
import { PointCalculationResult, fromHeadingInDegreeToAngleInRadian, getPathPoints, simplePoints } from "../core/Calculation";
import { FieldImageOriginType, FieldImageSignatureAndOrigin, getDefaultBuiltInFieldImage } from "../core/Asset";

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

  @Exclude()
  private format_: LemLibOdomFormatV0_1;

  constructor(format: LemLibOdomFormatV0_1) {
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
    return <></>;
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
  readonly format: LemLibOdomFormatV0_1;

  @Exclude()
  public path!: Path;

  constructor(format: LemLibOdomFormatV0_1) {
    this.format = format;
    makeAutoObservable(this);
  }

  getConfigPanel() {
    return (<></>);
  }
}

// observable class
export class LemLibOdomFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new LemLibOdomFormatV0_1();
  }

  getName(): string {
    return "LemLib Odometry v0.1.x (inch coordinates)";
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

  async exportPathFile(): Promise<string> {
    const { app, confirmation } = getAppStores();

    let rtn = "";

    const path = app.interestedPath();
    if (path === undefined) throw new Error("No path to export");
    if (path.segments.length === 0) throw new Error("No segment to export");

    const uc = new UnitConverter(this.gc.uol, UnitOfLength.Inch);
    const points = simplePoints(path);

    const name = await confirmation.prompt({
      title: "Export Info",
      description: "",
      buttons: [
        {
          label: "Confirm",
          color: "success"
        }
      ],
      inputLabel: "Chassis Variable Name",
      inputDefaultValue: "chassis"
    });
    
    if (points.length > 0) {
        const start = points[0]
        let heading = 0;
        if (start.heading !== undefined) {
          heading = fromHeadingInDegreeToAngleInRadian(start.heading);
        }

        // ALGO: Offsets to convert the absolute coordinates to the relative coordinates LemLib uses
        const offsets = new Vector(start.x, start.y);
        for (const point of points) {
            // ALGO: Only coordinate points are supported in LemLibOdom format
            const relative = new Vector(point.x - offsets.x, point.y - offsets.y).rotate(heading);
            rtn += `${name}.moveTo(${uc.fromAtoB(relative.x).toUser()}, ${uc.fromAtoB(relative.y).toUser()});\n`;
        }
    }
    return rtn;
  }
}
