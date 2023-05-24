import { makeAutoObservable } from "mobx"
import { MainApp } from '../app/MainApp';
import { makeId } from "../app/Util";
import { UnitConverter, UnitOfLength } from "../math/unit";
import { GeneralConfig, OutputConfig, SpeedConfig } from "./config";
import { Format } from "./format";
import { NumberRange, RangeSlider } from "../app/RangeSlider";
import { Box, Typography } from "@mui/material";

// observable class
class GeneralConfigImpl implements GeneralConfig {
  robotWidth: number = 30;
  robotHeight: number = 30;
  showRobot: boolean = true;
  uol: UnitOfLength = UnitOfLength.Centimeter;
  knotDensity: number = 2;
  controlMagnetDistance: number = 5;

  constructor() {
    makeAutoObservable(this);
  }

  getConfigPanel() {
    return <></>
  }
}

// observable class
class SpeedConfigImpl implements SpeedConfig {
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
  transitionRange: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 1, label: "1" },
    step: 0.01,
    from: 0,
    to: 0.95,
  };

  constructor() {
    makeAutoObservable(this);
  }

  getConfigPanel() {
    return (
      <>
        <Box className="panel-box">
          <Typography>Min/Max Speed</Typography>
          <RangeSlider range={this.speedLimit} />
        </Box>
        <Box className="panel-box">
          <Typography>Curve Deceleration Range</Typography>
          <RangeSlider range={this.applicationRange} />
        </Box>
        <Box className="panel-box">
          <Typography>Acceleration/Deceleration</Typography>
          <RangeSlider range={this.transitionRange} inverted />
        </Box>
      </>
    )
  }
}

// observable class
class OutputConfigImpl implements OutputConfig {

  constructor() {
    makeAutoObservable(this);
  }

  getConfigPanel() {
    return <></>
  }
}

export class PathDotJerryioFormatV0_1 implements Format {
  isInit: boolean = false;
  uid: string;

  constructor() {
    this.uid = makeId(10);
  }

  getName(): string {
    return "path.jerryio v0.1.x (cm, rpm)";
  }

  init(): void {
    if (this.isInit) return;
    this.isInit = true;
  }

  buildGeneralConfig(): GeneralConfig {
    return new GeneralConfigImpl();
  }

  buildSpeedConfig(): SpeedConfig {
    return new SpeedConfigImpl();
  }

  buildOutputConfig(): OutputConfig {
    return new OutputConfigImpl();
  }

  exportPathFile(app: MainApp): string | undefined {
    let rtn = "";

    const uc = new UnitConverter(app.gc.uol, UnitOfLength.Centimeter);

    for (const path of app.paths) {
      rtn += `#PATH-KNOTS-START ${path.name}\n`;

      const knots = path.calculateKnots(app.gc, app.sc);
      for (const knot of knots) {
        const x = uc.fromAtoB(knot.x);
        const y = uc.fromAtoB(knot.y);
        if (knot.heading !== undefined)
          rtn += `${x},${y},${knot.speed.toFixed(3)},${knot.heading}\n`;
        else
          rtn += `${x},${y},${knot.speed.toFixed(3)}\n`;
      }

      rtn += `#PATH-KNOTS-END\n`;
      rtn += `#PATH-EDITOR ${path.name}\n`; // TODO
    }

    rtn += "#PATH.JERRYIO-DATA " + JSON.stringify(app.exportAppData());

    return rtn;
  }
}
