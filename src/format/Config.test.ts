import { makeAutoObservable } from "mobx";

import { Expose, Exclude, plainToClassFromExist } from "class-transformer";
import { IsBoolean, IsPositive, validate } from "class-validator";
import { NumberRange, ValidateNumberRange } from "../component/RangeSlider";
import { Path } from "../core/Path";
import { UnitOfLength } from "../core/Unit";
import { GeneralConfig, PathConfig } from "./Config";
import { Format } from "./Format";
import { ValidateNumber } from "../core/Util";
import { CustomFormat } from "./Format.test";

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

export class CustomPathConfig implements PathConfig {
  @Expose()
  public custom: string = "custom";

  @Exclude()
  public path!: Path;

  @ValidateNumberRange(-Infinity, Infinity)
  @Expose()
  speedLimit: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 127, label: "127" },
    step: 1,
    from: 20,
    to: 100
  };

  @ValidateNumberRange(-Infinity, Infinity)
  @Expose()
  bentRateApplicableRange: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 4, label: "4" },
    step: 0.01,
    from: 1.4,
    to: 1.8
  };

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
