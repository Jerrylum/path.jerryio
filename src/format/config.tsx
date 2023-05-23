import { makeAutoObservable } from "mobx"
import { Box, Typography } from "@mui/material";
import { NumberRange, RangeSlider } from "../app/RangeSlider";
import { UnitOfLength } from "../math/unit";

export interface ConfigSection {
  getConfigPanel(): JSX.Element;
}

// observable class
export class GeneralConfig implements ConfigSection {
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
export class SpeedConfig implements ConfigSection {
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
export class OutputConfig implements ConfigSection {

  constructor() {
    makeAutoObservable(this);
  }

  getConfigPanel() {
    return <></>
  }
}
