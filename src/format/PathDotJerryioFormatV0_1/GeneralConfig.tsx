import { makeAutoObservable } from "mobx";
import { FieldImageSignatureAndOrigin, FieldImageOriginType, getDefaultBuiltInFieldImage } from "@core/Asset";
import { UnitOfLength } from "@core/Unit";
import { ValidateNumber } from "@core/Util";
import { Expose, Type, Exclude } from "class-transformer";
import { IsPositive, IsBoolean, ValidateNested, IsObject, IsIn } from "class-validator";
import { GeneralConfig, initGeneralConfig } from "../Config";
import { Format } from "../Format";
import { getNamedCoordinateSystems } from "@src/core/CoordinateSystem";

// observable class
export class GeneralConfigImpl implements GeneralConfig {
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
  @IsIn(getNamedCoordinateSystems().map(s => s.name))
  @Expose()
  coordinateSystem: string = "VEX Gaming Positioning System";
  @Exclude()
  private format_: Format;

  constructor(format: Format) {
    this.format_ = format;
    makeAutoObservable(this);

    initGeneralConfig(this);
  }

  get format() {
    return this.format_;
  }

  getAdditionalConfigUI() {
    return <></>;
  }
}
