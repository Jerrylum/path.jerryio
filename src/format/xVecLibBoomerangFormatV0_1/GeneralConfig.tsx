import { makeAutoObservable, action } from "mobx";
import { Typography, Button } from "@mui/material";
import { enqueueSuccessSnackbar, enqueueErrorSnackbar } from "@src/app/Notice";
import { FieldImageSignatureAndOrigin, FieldImageOriginType, getDefaultBuiltInFieldImage } from "@core/Asset";
import { UpdateProperties } from "@core/Command";
import { useCustomHotkeys, getEnableOnNonTextInputFieldsHotkeysOptions } from "@core/Hook";
import { getAppStores } from "@core/MainApp";
import { Logger } from "@core/Logger";
import { UnitOfLength } from "@core/Unit";
import { IS_MAC_OS, getMacHotKeyString, ValidateNumber } from "@core/Util";
import { Int, CodePointBuffer } from "@src/token/Tokens";
import { Expose, Type, Exclude } from "class-transformer";
import { IsPositive, IsBoolean, ValidateNested, IsObject, IsString, MinLength, IsIn } from "class-validator";
import { observer } from "mobx-react-lite";
import { GeneralConfig, initGeneralConfig } from "../Config";
import { Format } from "../Format";
import { PanelBox } from "@src/app/component.blocks/PanelBox";
import { FormInputField } from "@src/app/component.blocks/FormInputField";
import { getNamedCoordinateSystems } from "@src/core/CoordinateSystem";
import { FormCheckbox } from "@src/app/component.blocks/FormCheckbox";
interface FormatWithExportCode extends Format {
  exportCode(): string;
}

const logger = Logger("xVecLib Boomerang v1.0.0 (inch)");

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

  useCustomHotkeys("Shift+Mod+C", onCopyCode, getEnableOnNonTextInputFieldsHotkeysOptions(isUsingEditor));

  const hotkey = IS_MAC_OS ? getMacHotKeyString("Shift+Mod+C") : "Shift+Ctrl+C";

  return (
    <>
      <Typography sx={{ marginTop: "16px" }}>Export Settings</Typography>
      <PanelBox className="Panel-FlexBox">
        <FormInputField
          label="Chassis Name"
          getValue={() => config.chassisName}
          setValue={(value: string) => {
            app.history.execute(`Change chassis variable name`, new UpdateProperties(config, { chassisName: value }));
          }}
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => candidate !== ""}
          sx={{ marginTop: "16px" }}
        />
        <FormInputField
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
      </PanelBox>

      <PanelBox marginTop="16px">
        <Button variant="contained" title={`Copy Generated Code (${hotkey})`} onClick={onCopyCode}>
          Copy Code
        </Button>
        <a href="https://xvec.codeberg.page/Path%20Generation"><h3>Documentation</h3></a>

      </PanelBox>
      <Typography sx={{ marginTop: "16px" }}>Lead Settings</Typography>
      <PanelBox className="Panel-FlexBox">
        <FormInputField
          label="Iterations to find lead"
          getValue={() => config.maxIterations.toString()}
          setValue={(value: string) => {
            const parsedValue = parseInt(Int.parse(new CodePointBuffer(value))!.value);
            app.history.execute(
              `Change max iterations for lead to ${parsedValue}`,
              new UpdateProperties(config, { maxIterations: parsedValue })
            );
          }}
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => Int.parse(new CodePointBuffer(candidate)) !== null}
          sx={{ marginTop: "16px" }}
          numeric
        />
        <FormCheckbox
          label="Use broken lead"
          checked={config.badLead}
          onCheckedChange={value => {
            app.history.execute(`Using real(bad) lead's is ${value}`, new UpdateProperties(config, { badLead: value }));
          }}
        />
      </PanelBox>
    </>
  );
});
export class GeneralConfigImpl implements GeneralConfig {
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
  @Expose()
  maxIterations: number = 200;
  @IsBoolean()
  @Expose()
  badLead: boolean = false;
  @IsBoolean()
  @Expose()
  relativeCoords: boolean = true;
  @IsIn(getNamedCoordinateSystems().map(s => s.name))
  @Expose()
  coordinateSystem: string = "VEX Gaming Positioning System";
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
