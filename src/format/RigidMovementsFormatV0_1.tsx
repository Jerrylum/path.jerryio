import { makeAutoObservable, action } from "mobx";
import { MainApp, getAppStores } from "@core/MainApp";
import {
  EditableNumberRange,
  IS_MAC_OS,
  ValidateEditableNumberRange,
  ValidateNumber,
  getMacHotKeyString,
  makeId
} from "@core/Util";
import { Quantity, UnitOfLength } from "@core/Unit";
import { GeneralConfig, PathConfig, convertFormat, initGeneralConfig } from "./Config";
import { Format, importPDJDataFromTextFile } from "./Format";
import { RangeSlider } from "@app/component.blocks/RangeSlider";
import { Box, Button, Typography } from "@mui/material";
import {
  AddCubicSegment,
  ConvertSegment,
  InsertControls,
  InsertPaths,
  UpdatePathTreeItems,
  UpdateProperties
} from "@core/Command";
import { Exclude, Expose, Type } from "class-transformer";
import { IsBoolean, IsObject, IsPositive, ValidateNested } from "class-validator";
import { PointCalculationResult, boundHeading, getPathPoints, toDerivativeHeading, toHeading } from "@core/Calculation";
import { BentRateApplicationDirection, EndControl, Path, Segment, SegmentVariant } from "@core/Path";
import { FieldImageOriginType, FieldImageSignatureAndOrigin, getDefaultBuiltInFieldImage } from "@core/Asset";
import { ObserverEnumSelect } from "@app/component.blocks/ObserverEnumSelect";
import { enqueueSuccessSnackbar, enqueueErrorSnackbar } from "@app/Notice";
import { useCustomHotkeys } from "@core/Hook";
import { observer } from "mobx-react-lite";
import { FormTags } from "react-hotkeys-hook/dist/types";
import { Logger } from "@core/Logger";

const logger = Logger("Rigid Movements Code Gen v0.1.x (cm, rpm)");

enum HeadingOutputType {
  Absolute = "Absolute Heading",
  Relative = "Relative Heading",
  Derivative = "Derivative Heading"
}

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
          <ObserverEnumSelect
            sx={{ marginTop: "16px", width: "50%" }}
            label="Heading Output Type"
            enumValue={config.headingOutputType}
            onEnumChange={value => {
              app.history.execute(
                `Set using heading output type to ${value}`,
                new UpdateProperties(config, { headingOutputType: value })
              );
            }}
            enumType={HeadingOutputType}
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
  @IsBoolean()
  @Expose()
  headingOutputType: HeadingOutputType = HeadingOutputType.Absolute;

  @Exclude()
  private format_: RigidMovementsFormatV0_1;

  constructor(format: RigidMovementsFormatV0_1) {
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
  readonly format: RigidMovementsFormatV0_1;

  @Exclude()
  public path!: Path;

  constructor(format: RigidMovementsFormatV0_1) {
    this.format = format;
    makeAutoObservable(this);
  }

  getConfigPanel() {
    const { app } = getAppStores();

    return (
      <>
        <Box className="Panel-Box">
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
        <Box className="Panel-Box">
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
export class RigidMovementsFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  private readonly disposers: (() => void)[] = [];

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new RigidMovementsFormatV0_1();
  }

  getName(): string {
    return "Rigid Code Gen v0.1.x (cm, rpm)";
  }

  register(app: MainApp): void {
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
        });
      });
    };

    this.disposers.push(
      app.history.addEventListener("beforeExecution", event => {
        if (event.isCommandInstanceOf(AddCubicSegment)) {
          event.isCancelled = true;
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
      })
    );
  }

  unregister(app: MainApp): void {
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
      });
    });
    return newPaths;
  }

  importPathsFromFile(buffer: ArrayBuffer): Path[] {
    throw new Error("Unable to import paths from this format, try other formats?");
  }

  importPDJDataFromFile(buffer: ArrayBuffer): Record<string, any> | undefined {
    return importPDJDataFromTextFile(buffer);
  }

  exportCode(): string {
    const { app } = getAppStores();

    let rtn = "";
    const gc = app.gc as GeneralConfigImpl;

    const path = app.interestedPath();
    if (path === undefined) throw new Error("No path to export");
    if (path.segments.length === 0) throw new Error("No segment to export");

    const startHeading = path.segments[0].first.heading;

    for (const segment of path.segments) {
      const first = segment.first;
      const last = segment.last;

      const distance = first.distance(last);

      const forwardHeading = toHeading(last.subtract(first));
      if (first.heading === forwardHeading) {
        rtn += `forward(${distance.toUser()});\n`;
      } else {
        // Assume it is backward
        rtn += `backward(${distance.toUser()});\n`;
      }

      const nextHeading = last.heading;
      if (gc.headingOutputType === HeadingOutputType.Absolute) {
        rtn += `turnTo(${nextHeading.toUser()});\n`;
      } else if (gc.headingOutputType === HeadingOutputType.Relative) {
        const deltaHeading = boundHeading(nextHeading - startHeading);
        rtn += `turnTo(${deltaHeading.toUser()});\n`;
      } else {
        const deltaHeading = toDerivativeHeading(forwardHeading, nextHeading);
        if (deltaHeading > 0) rtn += `turnRight(${deltaHeading.toUser()});\n`;
        else if (deltaHeading < 0) rtn += `turnLeft(${-deltaHeading.toUser()});\n`;
      }
    }

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
