import { makeAutoObservable, action } from "mobx";
import { MainApp, getAppStores } from "@core/MainApp";
import { EditableNumberRange, IS_MAC_OS, ValidateNumber, getMacHotKeyString, makeId } from "@core/Util";
import { BentRateApplicationDirection, EndControl, Path, Segment, SegmentVariant } from "@core/Path";
import { UnitOfLength, UnitConverter, Quantity } from "@core/Unit";
import { GeneralConfig, PathConfig, convertFormat, initGeneralConfig } from "./Config";
import { Format, importPDJDataFromTextFile } from "./Format";
import { Exclude, Expose, Type } from "class-transformer";
import { IsBoolean, IsObject, IsPositive, IsString, MinLength, ValidateNested } from "class-validator";
import {
  PointCalculationResult,
  getPathPoints,
  getDiscretePoints
} from "@core/Calculation";
import { FieldImageOriginType, FieldImageSignatureAndOrigin, getDefaultBuiltInFieldImage } from "@core/Asset";
import {
  AddCubicSegment,
  AddLinearSegment,
  AddPath,
  ConvertSegment,
  UpdateProperties
} from "@core/Command";
import { ObserverInput } from "@app/component.blocks/ObserverInput";
import { Box, Button, Typography } from "@mui/material";
import { CodePointBuffer, Int } from "../token/Tokens";
import { observer } from "mobx-react-lite";
import { enqueueErrorSnackbar, enqueueSuccessSnackbar } from "@app/Notice";
import { Logger } from "@core/Logger";
import { FormTags } from "react-hotkeys-hook/dist/types";
import { useCustomHotkeys } from "@core/Hook";
import { ObserverCheckbox } from "@app/component.blocks/ObserverCheckbox";

const logger = Logger("LemLib Odom Code Gen v0.4.x (inch)");

const GeneralConfigPanel = observer((props: { config: GeneralConfigImpl }) => {
  const { config } = props;

  const { app, confirmation, modals } = getAppStores();

  const isUsingEditor = !confirmation.isOpen && !modals.isOpen;

  const ENABLE_ON_NON_TEXT_INPUT_FIELDS = {
    preventDefaultOnlyIfEnabled: true,
    enableOnFormTags: ["input", "INPUT"] as FormTags[],
    // UX: It is okay to enable hotkeys on some input fields (e.g. checkbox, button, range)
    enabled: (kvEvt: KeyboardEvent) => {
      if (isUsingEditor === false) return false;
      if (kvEvt.target instanceof HTMLInputElement)
        return ["button", "checkbox", "radio", "range", "reset", "submit"].includes(kvEvt.target.type);
      else return true;
    }
  };

  const onCopyCode = action(() => {
    try {
      const code = config.format.exportCode();

      navigator.clipboard.writeText(code);

      enqueueSuccessSnackbar(logger, "Copied");
    } catch (e) {
      enqueueErrorSnackbar(logger, e);
    }
  });

  useCustomHotkeys("Shift+Mod+C", onCopyCode, ENABLE_ON_NON_TEXT_INPUT_FIELDS);

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
        <Box className="Panel-FlexBox">
          <ObserverCheckbox
            label="Use Relative Coordinates"
            checked={config.relativeCoords}
            onCheckedChange={value => {
              app.history.execute(
                `Set using relative coordinates to ${value}`,
                new UpdateProperties(config, { relativeCoords: value })
              );
            }}
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
  pointDensity: number = 1; // inches
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
  private format_: LemLibOdomGeneratorFormatV0_4;

  constructor(format: LemLibOdomGeneratorFormatV0_4) {
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
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 600, label: "600" },
    step: 1,
    from: 40,
    to: 120
  };
  @Exclude()
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
  maxDecelerationRate: number = 127;

  @Exclude()
  readonly format: LemLibOdomGeneratorFormatV0_4;

  @Exclude()
  public path!: Path;

  constructor(format: LemLibOdomGeneratorFormatV0_4) {
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
export class LemLibOdomGeneratorFormatV0_4 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);
  private readonly disposers: (() => void)[] = [];

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new LemLibOdomGeneratorFormatV0_4();
  }

  getName(): string {
    return "LemLib Odom Code Gen v0.4.x (inch)";
  }

  register(app: MainApp): void {
    if (this.isInit) return;
    this.isInit = true;

    this.disposers.push(
      app.history.addEventListener("beforeExecution", event => {
        if (event.isCommandInstanceOf(AddCubicSegment)) {
          // UX: Cancel the event and replace the cubic segment with a linear segment
          event.isCancelled = true;
          let targetPath: Path | undefined = app.interestedPath();
          if (targetPath === undefined) {
            // UX: Create empty new path if: no path exists
            targetPath = app.format.createPath();
            app.history.execute(`Add path ${targetPath.uid}`, new AddPath(app.paths, targetPath));
          }

          if (targetPath.visible && !targetPath.lock) {
            // UX: Add control point if: path is selected and visible and not locked
            let endpoint = new EndControl(event.command.end.x, event.command.end.y, event.command.end.heading);

            app.history.execute(
              `Add linear segment with end control point ${endpoint.uid} to path ${targetPath.uid}`,
              new AddLinearSegment(targetPath, endpoint)
            );
          }
        } else if (event.isCommandInstanceOf(ConvertSegment) && event.command.variant === SegmentVariant.Cubic) {
          event.isCancelled = true;
        }
      })
    );
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
    const gc = app.gc as GeneralConfigImpl;

    const path = app.interestedPath();
    if (path === undefined) throw new Error("No path to export");
    if (path.segments.length === 0) throw new Error("No segment to export");

    const uc = new UnitConverter(this.gc.uol, UnitOfLength.Inch);
    const points = getDiscretePoints(path);

    if (points.length > 0) {
      const start = points[0];

      // ALGO: Set the starting pose if using relative coordinates
      if (gc.relativeCoords) {
        rtn += `${gc.chassisName}.setPose(${start.x}, ${start.y}, ${start.heading});\n`;
      }

      for (const point of points) {
        // ALGO: Only coordinate points are supported in LemLibOdom format
        rtn += `${gc.chassisName}.moveTo(${uc.fromAtoB(point.x).toUser()}, ${uc.fromAtoB(point.y).toUser()}, ${
          gc.movementTimeout
        });\n`;
      }
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
