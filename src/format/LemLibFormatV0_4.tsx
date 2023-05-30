import { makeAutoObservable } from "mobx"
import { MainApp } from '../app/MainApp';
import { makeId } from "../app/Util";
import { Control, EndPointControl, Path, Spline, Vertex } from "../math/Path";
import { UnitOfLength, UnitConverter } from "../math/Unit";
import { GeneralConfig, OutputConfig, SpeedConfig } from "./Config";
import { Format, PathFileData } from "./Format";
import { Box, Typography } from "@mui/material";
import { NumberRange, RangeSlider } from "../app/RangeSlider";

// observable class
class GeneralConfigImpl implements GeneralConfig {
  robotWidth: number = 12;
  robotHeight: number = 12;
  showRobot: boolean = true;
  uol: UnitOfLength = UnitOfLength.Inch;
  knotDensity: number = 2; // inches
  controlMagnetDistance: number = 5 / 2.54;

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
    maxLimit: { value: 127, label: "127" },
    step: 1,
    from: 20,
    to: 100,
  };
  applicationRange: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 4, label: "4" },
    step: 0.01,
    from: 1.4,
    to: 1.8,
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

export class LemLibFormatV0_4 implements Format {
  isInit: boolean = false;
  uid: string;

  constructor() {
    this.uid = makeId(10);
  }

  getName(): string {
    return "LemLib v0.4.x (inch, byte-voltage)";
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

  recoverPathFileData(fileContent: string): PathFileData {
    // ALGO: The implementation is adopted from https://github.com/LemLib/Path-Gen under the GPLv3 license.

    const paths: Path[] = [];
    const gc = new GeneralConfigImpl();
    const oc = new OutputConfigImpl();

    // find the first line that is "endData"
    const lines = fileContent.split("\n");

    let i = lines.findIndex((line) => line === "endData");
    if (i === -1) throw new Error("Invalid file format, unable to find line 'endData'");

    // i + 1 Deceleration not supported.

    const maxSpeed = Number(lines[i + 2]);
    if (isNaN(maxSpeed)) throw new Error("Invalid file format, unable to parse max speed");

    // i + 3 Multiplier not supported.

    i += 4;

    const error = () => {
      throw new Error("Invalid file format, unable to parse spline at line " + (i + 1));
    }

    const num = (str: string): number => {
      const num = Number(str);
      if (isNaN(num)) error();
      return parseFloat(num.toFixed(3));
    }

    const push = (spline: Spline) => {
      // check if there is a path
      if (paths.length === 0) {
        const path = new Path(this.buildSpeedConfig(), spline);
        path.sc.speedLimit.to = Math.max(Math.min(Number(maxSpeed.toFixed(3)), path.sc.speedLimit.maxLimit.value), path.sc.speedLimit.minLimit.value);
        paths.push(path);
      } else {
        const path = paths[paths.length - 1];
        const lastSpline = path.splines[path.splines.length - 1];
        const a = lastSpline.last();
        const b = spline.first();

        if (a.x !== b.x || a.y !== b.y) error();

        path.splines.push(spline);
      }
    }

    while (i < lines.length - 1) { // ALGO: the last line is always empty, follow the original implementation.
      const line = lines[i];
      const tokens = line.split(", ");
      if (tokens.length !== 8) error();

      const p1 = new EndPointControl(num(tokens[0]), num(tokens[1]), 0);
      const p2 = new Control(num(tokens[2]), num(tokens[3]));
      const p3 = new Control(num(tokens[4]), num(tokens[5]));
      const p4 = new EndPointControl(num(tokens[6]), num(tokens[7]), 0);
      const spline = new Spline(p1, [p2, p3], p4);
      push(spline);

      i++;
    }

    return {
      format: this.getName(),
      gc,
      oc,
      paths
    };
  }

  exportPathFile(app: MainApp): string {
    // ALGO: The implementation is adopted from https://github.com/LemLib/Path-Gen under the GPLv3 license.

    let rtn = "";

    if (app.paths.length === 0) throw new Error("No path to export");

    const path = app.paths[0]; // TODO use selected path
    if (path.splines.length === 0) throw new Error("No spline to export");

    const uc = new UnitConverter(app.gc.uol, UnitOfLength.Inch);

    const knots = path.calculateKnots(app.gc);
    for (const knot of knots) {
      // ALGO: heading is not supported in LemLib V0.4 format.
      rtn += `${uc.fromAtoB(knot.x)}, ${uc.fromAtoB(knot.y)}, ${uc.fixPrecision(knot.speed)}\n`;
    }

    if (knots.length > 1) {
      /*
      Here is the original code of how the ghost knot is calculated:

      ```cpp
      // create a "ghost point" at the end of the path to make stopping nicer
      const lastPoint = path.points[path.points.length-1];
      const lastControl = path.splines[path.splines.length-1].p2;
      const ghostPoint = Vector.interpolate(Vector.distance(lastControl, lastPoint) + 20, lastControl, lastPoint);
      ```

      Notice that the variable "lastControl" is not the last control point, but the second last control point.
      This implementation is different from the original implementation by using the last knot and the second last knot.
      */
      const last2 = knots[knots.length - 2]; // second last knot, last knot by the calculation
      const last1 = knots[knots.length - 1]; // last knot, also the last control point
      // ALGO: The 20 inches constant is a constant value in the original LemLib-Path-Gen implementation.
      const ghostKnot = last2.interpolate(last1, last2.distance(last1) + uc.fromBtoA(20));
      rtn += `${uc.fromAtoB(ghostKnot.x)}, ${uc.fromAtoB(ghostKnot.y)}, 0\n`;
    }

    rtn += `endData\n`;
    rtn += `200\n`; // Not supported
    rtn += `${path.sc.speedLimit.to}\n`;
    rtn += `200\n`; // Not supported

    function output(control: Vertex, postfix: string = ", ") {
      rtn += `${uc.fromAtoB(control.x)}, ${uc.fromAtoB(control.y)}${postfix}`;
    }

    for (const spline of path.splines) {
      if (spline.controls.length === 4) {
        output(spline.controls[0]);
        output(spline.controls[1]);
        output(spline.controls[2]);
        output(spline.controls[3], "\n");
      } else if (spline.controls.length === 2) {
        const center = spline.controls[0].add(spline.controls[1]).divide(new Vertex(2, 2));
        output(spline.controls[0]);
        output(center);
        output(center);
        output(spline.controls[1], "\n");
      }
    }

    rtn += "#PATH.JERRYIO-DATA " + JSON.stringify(app.exportPathFileData());

    return rtn;
  }
}
