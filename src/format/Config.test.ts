import { makeAutoObservable } from "mobx";

import { Expose, Exclude, plainToClassFromExist, Type } from "class-transformer";
import { IsBoolean, IsIn, IsObject, IsPositive, ValidateNested, validate } from "class-validator";
import { BentRateApplicationDirection, Path } from "@core/Path";
import { UnitOfLength } from "@core/Unit";
import { GeneralConfig, PathConfig } from "./Config";
import { Format } from "./Format";
import { EditableNumberRange, ValidateEditableNumberRange, ValidateNumber } from "@core/Util";
import { CustomFormat } from "./Format.test";
import { FieldImageOriginType, FieldImageSignatureAndOrigin, getDefaultBuiltInFieldImage } from "@core/Asset";
import { getNamedCoordinateSystems } from "@src/core/CoordinateSystem";

export class CustomGeneralConfig implements GeneralConfig {
  public custom: string = "custom";

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
  showRobot: boolean = true;
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
  @IsIn(getNamedCoordinateSystems().map(s => s.name))
  @Expose()
  coordinateSystem: string = "VEX Gaming Positioning System";

  constructor() {
    makeAutoObservable(this);
  }

  get format(): Format {
    throw new Error("Method not implemented.");
  }

  getAdditionalConfigUI(): JSX.Element {
    throw new Error("Method not implemented.");
  }
}

export class CustomPathConfig implements PathConfig {
  @Expose()
  public custom: string = "custom";

  @Exclude()
  public path!: Path;

  @ValidateEditableNumberRange(-Infinity, Infinity)
  @Expose()
  speedLimit: EditableNumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 127, label: "127" },
    step: 1,
    from: 20,
    to: 100
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

  constructor() {
    makeAutoObservable(this);
  }

  get format(): Format {
    throw new Error("Method not implemented.");
  }

  getConfigPanel(): JSX.Element {
    throw new Error("Method not implemented.");
  }
}

test("Class transform path config", async () => {
  const f = new CustomFormat();
  const path = f.createPath();

  const pathRaw = {};
  const pathPC = path.pc;
  plainToClassFromExist(path, pathRaw, { excludeExtraneousValues: true, exposeDefaultValues: true });

  expect(
    plainToClassFromExist(pathPC, null, {
      excludeExtraneousValues: true,
      exposeDefaultValues: true
    })
  ).toBe(null);

  expect(
    plainToClassFromExist(pathPC, undefined, {
      excludeExtraneousValues: true,
      exposeDefaultValues: true
    })
  ).toBe(undefined);

  expect(
    plainToClassFromExist(pathPC, 123, {
      excludeExtraneousValues: true,
      exposeDefaultValues: true
    })
  ).toBe(123);

  expect(
    plainToClassFromExist(pathPC, NaN, {
      excludeExtraneousValues: true,
      exposeDefaultValues: true
    })
  ).toBe(NaN);

  expect(
    plainToClassFromExist(pathPC, [NaN], {
      excludeExtraneousValues: true,
      exposeDefaultValues: true
    })
  ).toStrictEqual([NaN]);

  expect(
    plainToClassFromExist(pathPC, "", {
      excludeExtraneousValues: true,
      exposeDefaultValues: true
    })
  ).toStrictEqual("");

  path.pc = plainToClassFromExist(pathPC, new CustomPathConfig(), {
    excludeExtraneousValues: true,
    exposeDefaultValues: true
  });
  expect(await validate(path.pc)).toHaveLength(0);
});
