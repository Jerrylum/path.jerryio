import { makeAutoObservable, reaction, action } from "mobx";
import { MainApp } from "../core/MainApp";
import { makeId } from "../core/Util";
import { Quantity, UnitConverter, UnitOfLength } from "../core/Unit";
import { GeneralConfig, PathConfig, convertGeneralConfigUOL, convertPathConfigPointDensity } from "./Config";
import { Format, PathFileData } from "./Format";
import { NumberRange, RangeSlider } from "../component/RangeSlider";
import { Box, Typography } from "@mui/material";
import { UpdateProperties } from "../core/Command";
import { Exclude } from "class-transformer";
import { PointCalculationResult, getPathPoints } from "../core/Calculation";
import { Path } from "../core/Path";
import { Coordinate, CoordinateWithHeading, EuclideanTransformation, isCoordinateWithHeading } from "../core/Coordinate";

// observable class
class GeneralConfigImpl implements GeneralConfig {
  robotWidth: number = 30;
  robotHeight: number = 30;
  robotIsHolonomic: boolean = false;
  showRobot: boolean = false;
  uol: UnitOfLength = UnitOfLength.Centimeter;
  pointDensity: number = 2;
  controlMagnetDistance: number = 5;

  @Exclude()
  private format_: PathDotJerryioFormatV0_1;

  constructor(format: PathDotJerryioFormatV0_1) {
    this.format_ = format;
    makeAutoObservable(this);

    reaction(
      () => this.uol,
      action((newUOL: UnitOfLength, oldUOL: UnitOfLength) => {
        convertGeneralConfigUOL(this, oldUOL);
      })
    );
  }

  get format() {
    return this.format_;
  }

  getConfigPanel(app: MainApp) {
    return <></>;
  }
}

// observable class
class PathConfigImpl implements PathConfig {
  speedLimit: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 600, label: "600" },
    step: 1,
    from: 40,
    to: 120
  };
  bentRateApplicableRange: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 4, label: "4" },
    step: 0.01,
    from: 1.4,
    to: 1.8
  };

  @Exclude()
  private format_: PathDotJerryioFormatV0_1;

  constructor(format: PathDotJerryioFormatV0_1) {
    this.format_ = format;
    makeAutoObservable(this);

    reaction(
      () => format.getGeneralConfig().pointDensity,
      action((val: number, oldVal: number) => {
        convertPathConfigPointDensity(this, oldVal, val);
      })
    );

    // ALGO: Convert the default parameters to the current point density
    // ALGO: This is only used when a new path is added, not when the path config is loaded
    convertPathConfigPointDensity(this, 2, format.getGeneralConfig().pointDensity);
  }

  get format() {
    return this.format_;
  }

  getConfigPanel(app: MainApp) {
    const pathUid = app.interestedPath()?.uid ?? "some-path-uid";

    return (
      <>
        <Box className="panel-box">
          <Typography>Min/Max Speed</Typography>
          <RangeSlider
            range={this.speedLimit}
            onChange={(from, to) =>
              app.history.execute(
                `Change path ${pathUid} min/max speed`,
                new UpdateProperties(this.speedLimit, { from, to })
              )
            }
          />
        </Box>
        <Box className="panel-box">
          <Typography>Bent Rate Applicable Range</Typography>
          <RangeSlider
            range={this.bentRateApplicableRange}
            onChange={(from, to) =>
              app.history.execute(
                `Change path ${pathUid} bent rate applicable range`,
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
export class PathDotJerryioFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  constructor() {
    this.uid = makeId(10);
    makeAutoObservable(this);
  }

  createNewInstance(): Format {
    return new PathDotJerryioFormatV0_1();
  }

  getName(): string {
    return "path.jerryio v0.1.x (cm, rpm)";
  }

  init(): void {
    if (this.isInit) return;
    this.isInit = true;
  }

  getGeneralConfig(): GeneralConfig {
    return this.gc;
  }

  buildPathConfig(): PathConfig {
    return new PathConfigImpl(this);
  }

  getPathPoints(path: Path): PointCalculationResult {
    return getPathPoints(path, new Quantity(this.gc.pointDensity, this.gc.uol));
  }

  recoverPathFileData(fileContent: string): PathFileData {
    throw new Error("Unable to recover path file data from this format, try other formats?");
  }

  exportPathFile(app: MainApp): string {
    let rtn = "";

    const uc = new UnitConverter(app.gc.uol, UnitOfLength.Centimeter);
    const density = new Quantity(app.gc.pointDensity, app.gc.uol);

    for (const path of app.paths) {
      rtn += `#PATH-POINTS-START ${path.name}\n`;

      const points = getPathPoints(path, density).points;

      if (points.length === 0) continue;
      const rotation = new EuclideanTransformation(points[0] as CoordinateWithHeading);

      for (const point of points) {
        const result1: Coordinate | CoordinateWithHeading = rotation.transform(point);

        const x = uc.fromAtoB(result1.x).toUser();
        const y = uc.fromAtoB(result1.y).toUser();
        if (isCoordinateWithHeading(result1)) rtn += `${x},${y},${point.speed.toUser()},${result1.heading}\n`;
        else rtn += `${x},${y},${point.speed.toUser()}\n`;
      }
    }

    rtn += "#PATH.JERRYIO-DATA " + JSON.stringify(app.exportPathFileData());

    return rtn;
  }
}
