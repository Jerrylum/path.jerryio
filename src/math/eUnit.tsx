
export enum UnitOfLength {
  Millimeter = 1,
  Centimeter, // default
  Meter,
  Inch,
  Foot,
}

const ratioCentimeter = 1;
const ratioMillimeter = ratioCentimeter / 10;
const ratioMeter = 100 * ratioCentimeter; // SI base unit
const ratioInch = 2.54 * ratioCentimeter;
const ratioFoot = 12 * ratioInch;

export class UnitConverter {
  private aRatio: number;
  private bRatio: number;

  constructor(private alphaUOL: UnitOfLength, private betaUOL: UnitOfLength, private precision: number = 3) {
    this.aRatio = UnitConverter.getRatio(alphaUOL);
    this.bRatio = UnitConverter.getRatio(betaUOL);
  }

  static getRatio(UOL: number): number {
    switch (UOL) {
      case UnitOfLength.Millimeter:
        return ratioMillimeter;
      case UnitOfLength.Centimeter:
        return ratioCentimeter;
      case UnitOfLength.Meter:
        return ratioMeter;
      case UnitOfLength.Inch:
        return ratioInch;
      case UnitOfLength.Foot:
        return ratioFoot;
      default:
        return 1;
    }
  }

  getAlphaUOL(): UnitOfLength {
    return this.alphaUOL;
  }

  getBetaUOL(): UnitOfLength {
    return this.betaUOL;
  }

  fromAtoB(a: number): number {
    return this.fixPrecision(a * this.aRatio / this.bRatio);
  }

  fromBtoA(b: number): number {
    return this.fixPrecision(b * this.bRatio / this.aRatio);
  }

  fixPrecision(some: number): number {
    return parseFloat(some.toFixed(this.precision));
  }

}
