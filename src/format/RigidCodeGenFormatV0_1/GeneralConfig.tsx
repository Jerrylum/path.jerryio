import { makeAutoObservable, action, observable, IObservableValue } from "mobx";
import { Typography, Button, TextField } from "@mui/material";
import { enqueueSuccessSnackbar, enqueueErrorSnackbar } from "@src/app/Notice";
import { FormEnumSelect } from "@src/app/component.blocks/FormEnumSelect";
import { FieldImageSignatureAndOrigin, FieldImageOriginType, getDefaultBuiltInFieldImage } from "@core/Asset";
import { UpdateProperties } from "@core/Command";
import { useCustomHotkeys, getEnableOnNonTextInputFieldsHotkeysOptions } from "@core/Hook";
import { getAppStores } from "@core/MainApp";
import { Logger } from "@core/Logger";
import { UnitOfLength } from "@core/Unit";
import { IS_MAC_OS, getMacHotKeyString, ValidateNumber } from "@core/Util";
import { Expose, Exclude, Type } from "class-transformer";
import { IsPositive, IsBoolean, ValidateNested, IsObject, IsEnum, IsString, IsIn } from "class-validator";
import { observer } from "mobx-react-lite";
import { GeneralConfig, initGeneralConfig } from "../Config";
import { Format } from "../Format";
import { PanelBox } from "@src/app/component.blocks/PanelBox";
import { getNamedCoordinateSystems } from "@src/core/CoordinateSystem";

interface FormatWithExportCode extends Format {
  exportCode(): string;
}

const logger = Logger("Rigid Code Gen v0.1.x");

export enum HeadingOutputType {
  Absolute = "Absolute Heading",
  Relative = "Relative Heading",
  Derivative = "Derivative Heading"
}

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

  const { app, confirmation, ui } = getAppStores();

  const isUsingEditor = !confirmation.isOpen && !ui.isOpeningModal;

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

  useCustomHotkeys("Shift+Mod+C", onCopyCode, getEnableOnNonTextInputFieldsHotkeysOptions(isUsingEditor));

  const hotkey = IS_MAC_OS ? getMacHotKeyString("Shift+Mod+C") : "Shift+Ctrl+C";

  return (
    <>
      <Typography marginTop="16px">Export Settings</Typography>
      <PanelBox>
        <FormEnumSelect
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
      </PanelBox>
      <PanelBox marginTop="32px">
        <Button variant="contained" title={`Copy Generated Code (${hotkey})`} onClick={onCopyCode}>
          Copy Code
        </Button>
        <Button variant="text" onClick={onEditTemplate}>
          Edit Template
        </Button>
      </PanelBox>
    </>
  );
});

// observable class
export class GeneralConfigImpl implements GeneralConfig {
  @IsPositive()
  @Expose()
  robotWidth: number = 30;
  @IsPositive()
  @Expose()
  robotHeight: number = 30;
  @Exclude()
  readonly robotIsHolonomic = "force-static";
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
  @IsIn(getNamedCoordinateSystems().map(s => s.name))
  @Expose()
  coordinateSystem: string = "VEX Gaming Positioning System";
  @IsEnum(HeadingOutputType)
  @Expose()
  headingOutputType: HeadingOutputType = HeadingOutputType.Absolute;
  @IsString()
  // TODO: validate
  @Expose()
  outputTemplate: string = `path: \`// \${name}

\${code}
\`
forward: \`forward(\${distance}, \${speed});\`
backward: \`backward(\${distance}, \${speed});\`
turnLeft: \`turnLeft(\${heading}, \${speed});\`
turnRight: \`turnRight(\${heading}, \${speed});\`
turnTo: \`turnTo(\${heading}, \${speed});\``;

  @Exclude()
  private format_: FormatWithExportCode;

  constructor(format: FormatWithExportCode) {
    this.format_ = format;
    makeAutoObservable(this);

    initGeneralConfig(this);
  }

  get format() {
    return this.format_;
  }

  getAdditionalConfigUI() {
    return <GeneralConfigPanel config={this} />;
  }
}
