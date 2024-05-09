import { makeAutoObservable, action } from "mobx";
import { MainApp, getAppStores } from "@core/MainApp";
import { EditableNumberRange, IS_MAC_OS, ValidateNumber, getMacHotKeyString, makeId } from "@core/Util";
import { BentRateApplicationDirection, Path, Segment } from "@core/Path";
import { UnitOfLength, UnitConverter, Quantity } from "@core/Unit";
import { GeneralConfig, PathConfig, convertFormat, initGeneralConfig } from "./Config";
import { Format, importPDJDataFromTextFile } from "./Format";
import { Exclude, Expose, Type } from "class-transformer";
import { IsBoolean, IsObject, IsPositive, IsString, MinLength, ValidateNested } from "class-validator";
import { PointCalculationResult, getPathPoints } from "@core/Calculation";
import { FieldImageOriginType, FieldImageSignatureAndOrigin, getDefaultBuiltInFieldImage } from "@core/Asset";
import { UpdateProperties } from "@core/Command";
import { ObserverInput } from "@app/component.blocks/ObserverInput";
import { Box, Button, Typography } from "@mui/material";
import { CodePointBuffer, Int } from "../token/Tokens";
import { observer } from "mobx-react-lite";
import { enqueueErrorSnackbar, enqueueSuccessSnackbar } from "@app/Notice";
import { Logger } from "@core/Logger";
import { getEnableOnNonTextInputFieldsHotkeysOptions, useCustomHotkeys } from "@core/Hook";

const logger = Logger("xVecLib Boomerang v0.1.0 (inch)");

const GeneralConfigPanel = observer((props: { config: GeneralConfigImpl }) => {
  const { config } = props;

  const { app, confirmation, modals } = getAppStores();

  const isUsingEditor = !confirmation.isOpen && !modals.isOpen;

  const onCopyCode = action(() => {
    try {
      const code = config.format.exportCode();

      navigator.clipboard.writeText(code);

      enqueueSuccessSnackbar(logger, "Copied");
    } catch (e) {
      enqueueErrorSnackbar(logger, e);
    }
  });

  useCustomHotkeys("Shift+Mod+C", onCopyCode, getEnableOnNonTextInputFieldsHotkeysOptions(isUsingEditor));

  const hotkey = IS_MAC_OS ? getMacHotKeyString("Shift+Mod+C") : "Shift+Ctrl+C";

  return (
    <>
      <Box className="Panel-Box">
        <Typography sx={{ marginTop: "16px" }}>Export Settings</Typography>
        <Box className="Panel-FlexBox">
          <ObserverInput
            label="Chassis Name"
            getValue={() => config.chassisName}
            setValue={(value: string) => {
              app.history.execute(`Change chassis variable name`, new UpdateProperties(config, { chassisName: value }));
            }}
            isValidIntermediate={() => true}
            isValidValue={(candidate: string) => candidate !== ""}
            sx={{ marginTop: "16px" }}
          />
          <ObserverInput
            label="Movement Timeout"
            getValue={() => config.movementTimeout.toString()}
            setValue={(value: string) => {
              const parsedValue = parseInt(Int.parse(new CodePointBuffer(value))!.value);
              app.history.execute(
                `Change default movement timeout to ${parsedValue}`,
                new UpdateProperties(config, { movementTimeout: parsedValue })
              );
            }}
            isValidIntermediate={() => true}
            isValidValue={(candidate: string) => Int.parse(new CodePointBuffer(candidate)) !== null}
            sx={{ marginTop: "16px" }}
            numeric
          />
        </Box>
        <Box className="Panel-FlexBox" sx={{ marginTop: "32px" }}>
          <Button variant="contained" title={`Copy Generated Code (${hotkey})`} onClick={onCopyCode}>
            Copy Code
          </Button>
        </Box>
      </Box>
    </>
  );
});

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
  @IsString()
  @MinLength(1)
  @Expose()
  chassisName: string = "chassis";
  @ValidateNumber(num => num >= 0)
  @Expose()
  movementTimeout: number = 5000;
  @IsBoolean()
  @Expose()
  relativeCoords: boolean = true;
  @Exclude()
  private format_: xVecLibBoomerangFormatV0_1;

  constructor(format: xVecLibBoomerangFormatV0_1) {
    this.format_ = format;
    makeAutoObservable(this);

    initGeneralConfig(this);
  }

  get format() {
    return this.format_;
  }

  getConfigPanel() {
    return <GeneralConfigPanel config={this} />;
  }
}

// observable class
class PathConfigImpl implements PathConfig {
  @Exclude()
  speedLimit: EditableNumberRange = {
    minLimit: { value: 0, label: "" },
    maxLimit: { value: 0, label: "" },
    step: 0,
    from: 0,
    to: 0
  };
  @Exclude()
  bentRateApplicableRange: EditableNumberRange = {
    minLimit: { value: 0, label: "" },
    maxLimit: { value: 0, label: "" },
    step: 0,
    from: 0,
    to: 0
  };
  @Exclude()
  bentRateApplicationDirection = BentRateApplicationDirection.HighToLow;

  @Exclude()
  readonly format: xVecLibBoomerangFormatV0_1;

  @Exclude()
  public path!: Path;

  constructor(format: xVecLibBoomerangFormatV0_1) {
    this.format = format;
    makeAutoObservable(this);
  }

  getConfigPanel() {
    return (
      <>
        <Typography>(No setting)</Typography>
      </>
    );
  }
}

// observable class
export class xVecLibBoomerangFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new xVecLibBoomerangFormatV0_1();
  }

  getName(): string {
    return "xVecLib Boomerang v0.1.0 (inch)";
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
    const result = getPathPoints(path, new Quantity(this.gc.pointDensity, this.gc.uol));
    return result;
  }

  convertFromFormat(oldFormat: Format, oldPaths: Path[]): Path[] {
    return convertFormat(this, oldFormat, oldPaths);
  }

  importPathsFromFile(buffer: ArrayBuffer): Path[] {
    throw new Error("Unable to import paths from this format, try other formats?");
  }

  exportCode(): string {
    const { app } = getAppStores();
    let rtn = "";
    let arr = [];

    const gc = app.gc as GeneralConfigImpl;

    const path = app.interestedPath();
    if (path === undefined) throw new Error("No path to export");
    if (path.segments.length === 0) throw new Error("No segment to export");

    const uc = new UnitConverter(this.gc.uol, UnitOfLength.Inch);
    const points = path.segments;
    if (points.length > 0) {
      for (const point of points) {
        if (path.segments.indexOf(point) === 0) {
          rtn += `robo.set(${Math.round(point.first.x)}, ${Math.round(point.first.y)});\n`;
          rtn += `imu.set_rotation(${point.first.heading});\n`;
          rtn += `ou.printCoords();\n`;
          // point.first.heading = -Math.atan2(point.first.x - point.last.x, point.first.y - point.last.y)* (180 / 3.14159265358979323846);
        }
        let pnt = 0;
        let last = path.controls.at(path.controls.length - 1);
        let dis;
        if (last != null) {
          dis = path.controls.at(0)?.distance(last);
          if (point.isCubic() && dis != null) {
            let poin =
              point.controls[1].distance(point.first) > point.controls[2].distance(point.last)
                ? point.controls[1]
                : point.controls[2];
            if (point.first.heading === 0) {
              point.first.heading =
                Math.atan2(point.first.x - poin.x, point.first.y - poin.y) * (180 / 3.14159265358979323846);
            }
            if (point.last.heading === 0) {
              point.last.heading =
                Math.atan2(point.last.x - poin.x, point.last.y - poin.y) * (180 / 3.14159265358979323846);
            }
            console.log(dis);

            if (path.segments.indexOf(point) === path.segments.length - 1) {
              pnt = -(point.first.x - poin.x) / (dis * Math.sin(point.first.heading));
              console.log(point.first.heading);
              console.log(point.first);
              console.log(dis * Math.sin(point.first.heading));
            } else {
              pnt = -(point.last.x - poin.x) / (dis * Math.sin(point.last.heading));
              console.log(point.last.heading);
              console.log(point.last);
              console.log(dis * Math.sin(point.last.heading));
            }
            console.log(poin);
            console.log(pnt);
          }
        }
        arr.push([
          gc.chassisName,
          uc.fromAtoB(point.last.x).toUser(),
          uc.fromAtoB(point.last.y).toUser(),
          point.last.heading,
          pnt
        ]);
      }
    }
    for (const s of arr) {
      rtn += `${s[0]}.moveToBoom( ${s[1]}, ${s[2]}, ${s[3]}, ${s[4]},${gc.movementTimeout / 1000});\n`;
    }
    return rtn;
  }

  importPDJDataFromFile(buffer: ArrayBuffer): Record<string, any> | undefined {
    return importPDJDataFromTextFile(buffer);
  }

  exportFile(): ArrayBuffer {
    const { app } = getAppStores();

    let fileContent = this.exportCode();

    fileContent += "\n";

    fileContent += "#PATH.JERRYIO-DATA " + JSON.stringify(app.exportPDJData());

    return new TextEncoder().encode(fileContent);
  }
}
