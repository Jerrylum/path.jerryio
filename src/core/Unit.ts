// Enum UnitOfLength values in editor version 0.1.0
// 1 = Millimeter,
// 2 = Centimeter, // default
// 3 = Meter,
// 4 = Inch,
// 5 = Foot,

export enum UnitOfLength {
  Centimeter = 1, // default
  Millimeter = Centimeter / 10,
  Meter = 100 * Centimeter, // SI base unit
  Inch = 2.54 * Centimeter,
  Foot = 12 * Inch,
  Tile = 24 * Inch
}

// Degree and Radian are "units"
// Heading and Angle are context-dependent
// It is possible to have a heading in degree or in radian
// Heading starts from north (y+axis) and increases clockwise in [0, 360)
// Angle starts from east (x+axis) and increases counter-clockwise in (-180, 180]

export enum UnitOfAngle {
  Degree = 1, // default
  Radian = 180 / Math.PI
}

export type Unit = UnitOfLength | UnitOfAngle;

export class Quantity<T extends Unit> {
  constructor(public value: number, public unit: T) {}

  to(unit: T): number {
    return new UnitConverter(this.unit, unit).fromAtoB(this.value);
  }
}

export class UnitConverter<T extends Unit> {
  constructor(public alpha: T, public beta: T) {}

  fromAtoB(a: number): number {
    return (a * this.alpha) / this.beta;
  }

  fromBtoA(b: number): number {
    return (b * this.beta) / this.alpha;
  }
}
