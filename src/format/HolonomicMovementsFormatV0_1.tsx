import { makeAutoObservable, action, observable, IObservableValue } from "mobx";
import { MainApp, getAppStores } from "@core/MainApp";
import { EditableNumberRange, IS_MAC_OS, ValidateNumber, getMacHotKeyString, makeId } from "@core/Util";
import { Quantity, UnitOfLength } from "@core/Unit";
import { GeneralConfig, PathConfig, convertFormat, initGeneralConfig } from "./Config";
import { Format, importPDJDataFromTextFile } from "./Format";
import { Box, Button, TextField, Typography } from "@mui/material";
import { AddCubicSegment, AddLinearSegment, ConvertSegment, InsertControls, InsertPaths } from "@core/Command";
import { Exclude, Expose, Type } from "class-transformer";
import { IsBoolean, IsNumber, IsObject, IsPositive, IsString, ValidateNested } from "class-validator";
import { PointCalculationResult, getPathPoints } from "@core/Calculation";
import { BentRateApplicationDirection, EndControl, Path, Segment, SegmentVariant } from "@core/Path";
import { FieldImageOriginType, FieldImageSignatureAndOrigin, getDefaultBuiltInFieldImage } from "@core/Asset";
import { enqueueSuccessSnackbar, enqueueErrorSnackbar } from "@app/Notice";
import { useCustomHotkeys } from "@core/Hook";
import { observer } from "mobx-react-lite";
import { FormTags } from "react-hotkeys-hook/dist/types";
import { Logger } from "@core/Logger";
import { BackQuoteString, CodePointBuffer, NumberT } from "@token/Tokens";
import { ObserverInput } from "@app/component.blocks/ObserverInput";

const logger = Logger("Holonomic Movements Code Gen v0.1.x");

const EditOutputTemplateConfirmationDescription = observer((props: { value: IObservableValue<string> }) => {
  return (
    <>
      <Typography>Edit the output template to generate your own code.</Typography>
      <TextField
        InputLabelProps={{ shrink: true }}
        size="small"
        sx={{ width: "100%" }}
        multiline
        maxRows={4}
        value={props.value.get()}
        onChange={event => props.value.set(event.target.value)}
        data-gramm="false" // disable grammarly
      />
    </>
  );
});

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

  const onEditTemplate = action(() => {
    const editingOutputTemplate = observable.box(config.outputTemplate);

    confirmation.prompt({
      title: "Edit Output Template",
      description: <EditOutputTemplateConfirmationDescription value={editingOutputTemplate} />,
      buttons: [
        {
          label: "Save",
          color: "success",
          hotkey: "s",
          onClick: () => {
            config.outputTemplate = editingOutputTemplate.get();
          }
        },
        { label: "Don't Save", hotkey: "n" },
        { label: "Cancel", onClick: () => {} }
      ]
    });
  });

  useCustomHotkeys("Shift+Mod+C", onCopyCode, ENABLE_ON_NON_TEXT_INPUT_FIELDS);

  const hotkey = IS_MAC_OS ? getMacHotKeyString("Shift+Mod+C") : "Shift+Ctrl+C";

  return (
    <>
      <Box className="Panel-Box">
        <Box className="Panel-FlexBox" sx={{ marginTop: "32px" }}>
          <Button variant="contained" title={`Copy Generated Code (${hotkey})`} onClick={onCopyCode}>
            Copy Code
          </Button>
          <Button variant="text" onClick={onEditTemplate}>
            Edit Template
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
  @Exclude()
  readonly robotIsHolonomic = "force-holonomic";
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
  @IsString()
  @Expose()
  outputTemplate: string = `path: \`// \${name}

\${code}
\`
moveToPoint: \`moveToPoint(\${x}, \${y}, \${heading}, \${speed});\``;

  @Exclude()
  private format_: HolonomicMovementsFormatV0_1;

  constructor(format: HolonomicMovementsFormatV0_1) {
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
    maxLimit: { value: 1, label: "1" },
    step: 1,
    from: 0,
    to: 1
  };
  @Exclude()
  bentRateApplicableRange: EditableNumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 1, label: "1" },
    step: 0.001,
    from: 0,
    to: 1
  };
  @Exclude()
  bentRateApplicationDirection = BentRateApplicationDirection.LowToHigh;
  @IsNumber()
  @Expose()
  speed: number = 30;
  @Exclude()
  readonly format: HolonomicMovementsFormatV0_1;

  @Exclude()
  public path!: Path;

  constructor(format: HolonomicMovementsFormatV0_1) {
    this.format = format;
    makeAutoObservable(this);
  }

  getConfigPanel() {
    const { app } = getAppStores();

    return (
      <>
        <Box className="Panel-Box">
          <ObserverInput
            label="Speed"
            sx={{ width: "50%" }}
            getValue={() => this.speed.toUser() + ""}
            setValue={(value: string) => {
              this.speed = parseFloat(value);
            }}
            isValidIntermediate={() => true}
            isValidValue={(candidate: string) => NumberT.parse(new CodePointBuffer(candidate)) !== null}
            numeric
          />
        </Box>
      </>
    );
  }
}

// observable class
export class HolonomicMovementsFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  private readonly disposers: (() => void)[] = [];

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new HolonomicMovementsFormatV0_1();
  }

  getName(): string {
    return "Holonomic Code Gen v0.1.x";
  }

  register(app: MainApp): void {
    if (this.isInit) return;
    this.isInit = true;

    this.disposers.push(
      app.history.addEventListener("beforeExecution", event => {
        if (event.isCommandInstanceOf(AddCubicSegment)) {
          event.isCancelled = true;

          const cancelledCommand = event.command;
          app.history.execute(
            `Add linear segment with end control point ${cancelledCommand.end.uid} to path ${cancelledCommand.path.uid}`,
            new AddLinearSegment(cancelledCommand.path, cancelledCommand.end)
          );
        } else if (event.isCommandInstanceOf(ConvertSegment) && event.command.variant === SegmentVariant.Cubic) {
          event.isCancelled = true;
        } else if (event.isCommandInstanceOf(InsertPaths)) {
          event.command.inserting.forEach(path => {
            path.segments.forEach(segment => {
              segment.controls = [segment.first, segment.last];
            });
          });
        } else if (event.isCommandInstanceOf(InsertControls)) {
          event.command.inserting = event.command.inserting.filter(control => control instanceof EndControl);
        }
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
      });
      path.pc.speedLimit = {
        minLimit: { value: 0, label: "0" },
        maxLimit: { value: 1, label: "1" },
        step: 1,
        from: 0,
        to: 1
      };
      path.pc.bentRateApplicableRange = {
        minLimit: { value: 0, label: "0" },
        maxLimit: { value: 1, label: "1" },
        step: 0.001,
        from: 0,
        to: 1
      };
    });
    return newPaths;
  }

  importPathsFromFile(buffer: ArrayBuffer): Path[] {
    throw new Error("Unable to import paths from this format, try other formats?");
  }

  importPDJDataFromFile(buffer: ArrayBuffer): Record<string, any> | undefined {
    return importPDJDataFromTextFile(buffer);
  }

  private getTemplatesSet(): { [key: string]: string } {
    const template = this.gc.outputTemplate;
    const rtn: { [key: string]: string } = {};

    const cpb = new CodePointBuffer(template);

    while (cpb.hasNext()) {
      const key = cpb.readSafeChunk();
      const colon = cpb.next();

      if (key === "" || colon !== ":") {
        // skip this line
        while (cpb.hasNext() && cpb.next() !== "\n") {}
        continue;
      }

      cpb.readDelimiter();

      const value = BackQuoteString.parse(cpb);
      if (value === null) break;

      rtn[key] = value.content;

      // skip this line
      while (cpb.hasNext() && cpb.next() !== "\n") {}
    }

    return rtn;
  }

  private applyTemplate(template: string, values: { [key: string]: number | boolean | string }): string {
    return template.replace(/\${([^}]+)}/g, (_, key) => (values[key] ?? "") + "");
  }

  private exportHolonomicMovementCode(path: Path, templates: { [key: string]: string }) {
    let rtn = "";

    const pc = path.pc as PathConfigImpl;

    for (const segment of path.segments) {
      const last = segment.last;

      const nextHeading = last.heading;

      rtn +=
        this.applyTemplate(templates.moveToPoint ?? "", {
          x: last.x.toUser(),
          y: last.y.toUser(),
          heading: nextHeading.toUser(),
          speed: pc.speed
        }) + "\n";
    }

    return rtn;
  }

  exportCode(): string {
    const { app } = getAppStores();

    let rtn = "";

    const templates = this.getTemplatesSet();

    app.paths.forEach(path => {
      rtn += this.applyTemplate(templates.path ?? "", {
        name: path.name,
        code: this.exportHolonomicMovementCode(path, templates)
      });
    });

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
