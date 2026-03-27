import { SmartBuffer } from "smart-buffer";
import { MainApp, getAppStores } from "@core/MainApp";
import { LemLibFormatV1_0 } from ".";
import { EndControl, Segment } from "@core/Path";
import { LemLibV1_0 } from "./Serialization";

test("dummy", () => {
  const { app } = getAppStores(); // suppress constructor error
});

test("read write waypoint", () => {
  const buffer1 = SmartBuffer.fromSize(16);

  const point1: LemLibV1_0.LemLibWaypoint = {
    x: 1.5, // .5 precision
    y: 5.5, // .5 precision
    speed: 4.567,
    heading: 270.123,
    lookahead: 16 // .5 precision
  };

  LemLibV1_0.writeWaypoint(buffer1, point1);

  const point2 = LemLibV1_0.readWaypoint(buffer1);

  expect(point2.x).toBe(point1.x);
  expect(point2.y).toBe(point1.y);
  expect(point2.speed).toBe(point1.speed);
  expect(point2.heading).toBeCloseTo(point1.heading ?? 0);
  expect(point2.lookahead).toBe(point1.lookahead ?? 0);
});

test("read write path", () => {
  const format = new LemLibFormatV1_0();

  const path = format.createPath();

  path.segments.push(new Segment(new EndControl(60, 60, 0), new EndControl(62, 60, 90)));
  path.segments.push(new Segment(path.segments[path.segments.length - 1].last, new EndControl(63, 60, 180)));
  path.segments.push(new Segment(path.segments[path.segments.length - 1].last, new EndControl(64, 60, 270)));

  const buffer1 = SmartBuffer.fromSize(1024); // auto resize

  LemLibV1_0.writePath(buffer1, path);

  const result = LemLibV1_0.readPath(buffer1);

  expect(result.name).toBe(path.name);

  const points = path.cachedResult.points;

  expect(result.waypoints.length).toBe(points.length);

  for (let i = 0; i < points.length; i++) {
    const point1 = points[i];
    const point2 = result.waypoints[i];

    expect(point2.x).toBe(point1.x);
    expect(point2.y).toBe(point1.y);
    expect(point2.speed).toBeCloseTo(point1.speed);
    expect(point2.heading ?? 0).toBeCloseTo(point1.heading ?? 0);
    expect(point2.lookahead).toBe(point1.lookahead);
  }
});

test("read write path file", () => {
  const app = new MainApp();
  const format = new LemLibFormatV1_0();
  app.format = format;

  const path = format.createPath();
  app.paths.push(path);

  path.segments.push(new Segment(new EndControl(60, 60, 0), new EndControl(62, 60, 90)));
  path.segments.push(new Segment(path.segments[path.segments.length - 1].last, new EndControl(63, 60, 180)));
  path.segments.push(new Segment(path.segments[path.segments.length - 1].last, new EndControl(64, 60, 270)));

  const buffer1 = SmartBuffer.fromSize(1024); // auto resize

  const pathFileData = app.exportPDJData();
  LemLibV1_0.writePathFile(buffer1, [path], pathFileData);

  const result = LemLibV1_0.readPathFile(buffer1);
  expect(result?.pathFileData).toStrictEqual(pathFileData);
  expect(result?.paths.length).toBe(1);

  const resultPoints = result?.paths[0].waypoints!;
  const points = path.cachedResult.points;

  expect(resultPoints.length).toBe(points.length);

  for (let i = 0; i < points.length; i++) {
    const point1 = points[i];
    const point2 = resultPoints[i];

    expect(point2.x).toBe(point1.x);
    expect(point2.y).toBe(point1.y);
    expect(point2.speed).toBeCloseTo(point1.speed);
    expect(point2.heading ?? 0).toBeCloseTo(point1.heading ?? 0);
    expect(point2.lookahead).toBe(point1.lookahead);
  }
});
