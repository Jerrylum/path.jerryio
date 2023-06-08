import { makeAutoObservable } from "mobx"
import { MainApp } from '../app/MainApp';
import { makeId } from "../app/Util";
import { UnitConverter, UnitOfLength } from "../math/Unit";
import { GeneralConfig, PathConfig } from "./Config";
import { Format, PathFileData } from "./Format";
import { NumberRange, RangeSlider } from "../app/RangeSlider";
import { Box, Typography } from "@mui/material";
import { UpdatePropertiesCommand } from "../math/Command";
import { Exclude } from "class-transformer";

// observable class
class GeneralConfigImpl implements GeneralConfig {
  robotWidth: number = 30;
  robotHeight: number = 30;
  showRobot: boolean = true;
  uol: UnitOfLength = UnitOfLength.Centimeter;
  pointDensity: number = 2;
  controlMagnetDistance: number = 5;

  @Exclude()
  private format: PathDotJerryioFormatV0_1;

  constructor(format: PathDotJerryioFormatV0_1) {
    this.format = format;
    makeAutoObservable(this);
  }

  getConfigPanel(app: MainApp) {
    return <></>
  }
}

// observable class
class PathConfigImpl implements PathConfig {
  speedLimit: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 600, label: "600" },
    step: 1,
    from: 40,
    to: 120,
  };
  applicationRange: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 4, label: "4" },
    step: 0.01,
    from: 1.4,
    to: 1.8,
  };

  @Exclude()
  private format: PathDotJerryioFormatV0_1;

  constructor(format: PathDotJerryioFormatV0_1) {
    this.format = format;
    makeAutoObservable(this);
  
    const defaultDensity = 2;
    const usingDensity = format.getGeneralConfig().pointDensity;

    console.log("defaultDensity", defaultDensity, "usingDensity", usingDensity);
    

    const applyMaxLimit = parseFloat((usingDensity * 2).toFixed(3));

    this.applicationRange.maxLimit.label = applyMaxLimit + "";
    this.applicationRange.maxLimit.value = applyMaxLimit;

    const ratio = usingDensity / defaultDensity;

    this.applicationRange.from *= ratio;
    this.applicationRange.from = parseFloat(this.applicationRange.from.toFixed(3));
    this.applicationRange.to *= ratio;
    this.applicationRange.to = parseFloat(this.applicationRange.to.toFixed(3));
  }

  getConfigPanel(app: MainApp) {
    const pathUid = app.interestedPath()?.uid ?? "some-path-uid";

    return (
      <>
        <Box className="panel-box">
          <Typography>Min/Max Speed</Typography>
          <RangeSlider range={this.speedLimit} onChange={
            (from, to) => app.history.execute(
              `Change path ${pathUid} min/max speed`,
              new UpdatePropertiesCommand(this.speedLimit, { from, to })
            )
          } />
        </Box>
        <Box className="panel-box">
          <Typography>Curve Deceleration Range</Typography>
          <RangeSlider range={this.applicationRange} onChange={
            (from, to) => app.history.execute(
              `Change path ${pathUid} curve deceleration range`,
              new UpdatePropertiesCommand(this.applicationRange, { from, to })
            )
          } />
        </Box>
      </>
    )
  }
}

export class PathDotJerryioFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  private gc = new GeneralConfigImpl(this);

  constructor() {
    this.uid = makeId(10);
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

  recoverPathFileData(fileContent: string): PathFileData {
    throw new Error("Unable to recover path file data from this format, try other formats?");
  }

  exportPathFile(app: MainApp): string {
    let rtn = "";

    const uc = new UnitConverter(app.gc.uol, UnitOfLength.Centimeter);

    for (const path of app.paths) {
      rtn += `#PATH-POINTS-START ${path.name}\n`;

      const points = path.calculatePoints(app.gc).points;
      for (const point of points) {
        const x = uc.fromAtoB(point.x);
        const y = uc.fromAtoB(point.y);
        if (point.heading !== undefined)
          rtn += `${x},${y},${point.speed.toFixed(3)},${point.heading}\n`;
        else
          rtn += `${x},${y},${point.speed.toFixed(3)}\n`;
      }
    }

    rtn += "#PATH.JERRYIO-DATA " + JSON.stringify(app.exportPathFileData());

    return rtn;
  }
}
