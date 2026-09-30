import { xVecLibBoomerangFormatV0_1 } from ".";
import { MainApp, getAppStores } from "@core/MainApp";
import { Control, EndControl, Segment } from "@core/Path";
import { GeneralConfigImpl } from "./GeneralConfig";
import { SmartBuffer } from "smart-buffer";
import { LemLibV1_0 } from "../LemLibFormatV1_0/Serialization";
test("dummy", () => {
  const { app } = getAppStores(); // suppress constructor error
});
test("read write path file", () => {
  const format = new xVecLibBoomerangFormatV0_1();
  const path = format.createPath();

  const buffer1 = SmartBuffer.fromSize(1024); // auto resize
  path.segments.push(new Segment(new EndControl(1, 1, 0), new EndControl(60, 60, 90)));
  path.segments.push(new Segment(path.segments[path.segments.length - 1].last, new EndControl(63, 60, 180)));
  path.segments.push(new Segment(path.segments[path.segments.length - 1].last, new EndControl(64, 60, 270)));

  LemLibV1_0.writePath(buffer1, path);

  const result = LemLibV1_0.readPath(buffer1);

  expect(result.name).toBe(path.name);

  const points = path.cachedResult.points;

  expect(result.waypoints.length).toBe(points.length);

  for (let i = 0; i < points.length; i++) {
    const point1 = points[i];
    const point2 = result.waypoints[i];

    expect(point2.x).toBeCloseTo(point1.x, 0.1);
    expect(point2.y).toBeCloseTo(point1.y, 0.1);
    expect(point2.heading ?? 0).toBeCloseTo(point1.heading ?? 0);
  }

  // let code = format.exportCode();
  // console.log(code);
});
