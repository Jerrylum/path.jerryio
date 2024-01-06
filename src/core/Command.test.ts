import { CustomPathConfig } from "../format/Config.test";
import { AddLinearSegment, AddCubicSegment, ConvertSegment, SplitSegment, DragControls, AddKeyframe } from "./Command";
import { Control, EndControl, Keyframe, Path, Segment, SegmentVariant, SpeedKeyframe, Vector } from "./Path";

test("AddLinearSegment", () => {
  const path = new Path(new CustomPathConfig());
  const addLinearSegment = new AddLinearSegment(path, new EndControl(60, 60, 0));
  expect(path.segments.length).toBe(0);
  addLinearSegment.execute();
  expect(path.segments.length).toBe(1);
  expect(addLinearSegment.segment).not.toBeUndefined();
  expect(addLinearSegment.segment?.isLinear()).toBeTruthy();
  expect(addLinearSegment.addedItems.length).toBe(2);
  expect(addLinearSegment.addedItems).toStrictEqual(addLinearSegment.segment?.controls);

  path.segments = [new Segment(new EndControl(60, 60, 0), new EndControl(61, 60, 90))];
  const addLinearSegment2 = new AddLinearSegment(path, new EndControl(60, 60, 0));
  expect(path.segments.length).toBe(1);
  addLinearSegment2.execute();
  expect(path.segments.length).toBe(2);
  expect(addLinearSegment2.segment).not.toBeUndefined();
  expect(addLinearSegment2.segment?.isLinear()).toBeTruthy();
  expect(addLinearSegment2.addedItems.length).toBe(1);
  expect(addLinearSegment2.segment?.controls[0]).toStrictEqual(
    path.segments[0].controls[path.segments[0].controls.length - 1]
  );
  expect(addLinearSegment2.addedItems[0]).toStrictEqual(addLinearSegment2.segment?.controls[1]);

  addLinearSegment2.undo();
  expect(path.segments.length).toBe(1);
  addLinearSegment2.redo();
  expect(path.segments.length).toBe(2);
});

test("AddCubicSegment", () => {
  const path = new Path(new CustomPathConfig());
  const addCubicSegment = new AddCubicSegment(path, new EndControl(60, 60, 0));
  expect(path.segments.length).toBe(0);
  addCubicSegment.execute();
  expect(path.segments.length).toBe(1);
  expect(addCubicSegment.segment).not.toBeUndefined();
  expect(addCubicSegment.segment?.isCubic()).toBeTruthy();
  expect(addCubicSegment.addedItems.length).toBe(4);
  expect(addCubicSegment.addedItems).toStrictEqual(addCubicSegment.segment?.controls);

  path.segments = [new Segment(new EndControl(60, 60, 0), new EndControl(61, 60, 90))];
  const addCubicSegment2 = new AddCubicSegment(path, new EndControl(60, 60, 0));
  expect(path.segments.length).toBe(1);
  addCubicSegment2.execute();
  expect(path.segments.length).toBe(2);
  expect(addCubicSegment2.segment).not.toBeUndefined();
  expect(addCubicSegment2.segment?.isCubic()).toBeTruthy();
  expect(addCubicSegment2.addedItems.length).toBe(3);
  expect(addCubicSegment2.segment?.controls[0]).toStrictEqual(
    path.segments[0].controls[path.segments[0].controls.length - 1]
  );
  expect(addCubicSegment2.addedItems[0]).toStrictEqual(addCubicSegment2.segment?.controls[1]);
  expect(addCubicSegment2.addedItems[1]).toStrictEqual(addCubicSegment2.segment?.controls[2]);
  expect(addCubicSegment2.addedItems[2]).toStrictEqual(addCubicSegment2.segment?.controls[3]);

  path.segments = [
    new Segment(new EndControl(60, 60, 0), new Control(0, 0), new Control(0, 0), new EndControl(61, 60, 90))
  ];
  const addCubicSegment3 = new AddCubicSegment(path, new EndControl(60, 60, 0));
  expect(path.segments.length).toBe(1);
  addCubicSegment3.execute();
  expect(path.segments.length).toBe(2);
  expect(addCubicSegment3.segment).not.toBeUndefined();
  expect(addCubicSegment3.segment?.isCubic()).toBeTruthy();
  expect(addCubicSegment3.addedItems.length).toBe(3);
  expect(addCubicSegment3.segment?.controls[0]).toStrictEqual(
    path.segments[0].controls[path.segments[0].controls.length - 1]
  );
  expect(addCubicSegment3.addedItems[0]).toStrictEqual(addCubicSegment3.segment?.controls[1]);
  expect(addCubicSegment3.addedItems[1]).toStrictEqual(addCubicSegment3.segment?.controls[2]);
  expect(addCubicSegment3.addedItems[2]).toStrictEqual(addCubicSegment3.segment?.controls[3]);

  addCubicSegment3.undo();
  expect(path.segments.length).toBe(1);
  addCubicSegment3.redo();
  expect(path.segments.length).toBe(2);
});

test("ConvertSegment", () => {
  const path = new Path(new CustomPathConfig());
  let segLinear = new Segment(new EndControl(60, 60, 0), new EndControl(61, 60, 90));
  let segCurve = new Segment(
    new EndControl(60, 60, 0),
    new Control(0, 0),
    new Control(0, 0),
    new EndControl(61, 60, 90)
  );

  path.segments = [];
  const convertSegment = new ConvertSegment(path, segLinear);
  convertSegment.execute();

  path.segments = [segLinear];
  const convertSegment2 = new ConvertSegment(path, segLinear);
  expect(path.segments.length).toBe(1);
  expect(path.segments[0].isLinear()).toBeTruthy();
  expect(convertSegment2.addedItems.length).toBe(0);
  expect(convertSegment2.removedItems.length).toBe(0);
  convertSegment2.execute();
  expect(path.segments.length).toBe(1);
  expect(path.segments[0].isCubic()).toBeTruthy();
  expect(convertSegment2.addedItems.length).toBe(2);
  expect(convertSegment2.removedItems.length).toBe(0);
  expect(convertSegment2.addedItems[0]).toStrictEqual(convertSegment2.segment?.controls[1]);
  expect(convertSegment2.addedItems[1]).toStrictEqual(convertSegment2.segment?.controls[2]);

  segLinear = new Segment(new EndControl(60, 60, 0), new EndControl(61, 60, 90));
  path.segments = [new Segment(new EndControl(60, 60, 0), new EndControl(61, 60, 90)), segLinear, segCurve];
  const convertSegment3 = new ConvertSegment(path, segLinear);
  expect(path.segments.length).toBe(3);
  expect(path.segments[0].isLinear()).toBeTruthy();
  expect(path.segments[1].isLinear()).toBeTruthy();
  expect(path.segments[2].isCubic()).toBeTruthy();
  convertSegment3.execute();
  expect(path.segments.length).toBe(3);
  expect(path.segments[1].isCubic()).toBeTruthy();

  path.segments = [segCurve];
  const convertSegment4 = new ConvertSegment(path, segCurve);
  expect(path.segments.length).toBe(1);
  expect(path.segments[0].isCubic()).toBeTruthy();
  expect(convertSegment4.addedItems.length).toBe(0);
  expect(convertSegment4.removedItems.length).toBe(0);
  convertSegment4.execute();
  expect(path.segments.length).toBe(1);
  expect(path.segments[0].isLinear()).toBeTruthy();
  expect(convertSegment4.addedItems.length).toBe(0);
  expect(convertSegment4.removedItems.length).toBe(2);

  convertSegment4.undo();
  expect(path.segments.length).toBe(1);
  expect(path.segments[0].isCubic()).toBeTruthy();
  convertSegment4.redo();
  expect(path.segments.length).toBe(1);
  expect(path.segments[0].isLinear()).toBeTruthy();
});

test("SplitSegment", () => {
  const path = new Path(new CustomPathConfig());
  const segLinear = new Segment(new EndControl(60, 60, 0), new EndControl(61, 60, 90));
  const segCurve = new Segment(
    new EndControl(60, 60, 0),
    new Control(0, 0),
    new Control(0, 0),
    new EndControl(61, 60, 90)
  );
  path.segments = [];
  const newpoint = new EndControl(60, 60, 0);
  //Case that the segment is not in the path
  const splitSegment = new SplitSegment(path, segLinear, newpoint);
  splitSegment.execute();

  path.segments = [segLinear];
  const splitSegment2 = new SplitSegment(path, segLinear, newpoint);
  expect(splitSegment.addedItems.length).toBe(0);
  splitSegment2.execute();
  expect(path.segments.length).toBe(2);
  expect(path.segments[0].isLinear()).toBeTruthy();
  expect(path.segments[1].isLinear()).toBeTruthy();
  expect(splitSegment2.addedItems.length).toBe(1);
  expect(splitSegment2.addedItems[0]).toStrictEqual(newpoint);
  expect(splitSegment2.newSegment).toStrictEqual(path.segments[1]);

  path.segments = [segCurve];
  const splitSegment3 = new SplitSegment(path, segCurve, newpoint);
  expect(splitSegment3.addedItems.length).toBe(0);
  splitSegment3.execute();
  expect(path.segments.length).toBe(2);
  expect(path.segments[0].isCubic()).toBeTruthy();
  expect(path.segments[1].isCubic()).toBeTruthy();
  expect(splitSegment3.addedItems.length).toBe(3);
  expect(splitSegment3.addedItems[1]).toStrictEqual(newpoint);
  expect(splitSegment3.newSegment).toStrictEqual(path.segments[1]);

  splitSegment3.undo();
  expect(path.segments.length).toBe(1);
  expect(path.segments[0].isCubic()).toBeTruthy();
  splitSegment3.redo();
  expect(path.segments.length).toBe(2);
  expect(path.segments[0].isCubic()).toBeTruthy();
});

test("DragControls", () => {
  const mainControl = new EndControl(60, 60, 0);
  const mainControl2 = new EndControl(69, 69, 0);
  const control1 = new EndControl(60, 60, 0);
  const followers = [control1];
  const followers2 = [new EndControl(60, 60, 0), new EndControl(60, 60, 0)];
  const followers3 = [new EndControl(42, 42, 0)];

  const dragControls = new DragControls(mainControl, new Vector(60, 60), new Vector(61, 61), followers);
  dragControls.execute();
  expect(mainControl.x).toBe(61);
  expect(mainControl.y).toBe(61);
  expect(control1.x).toBe(61);
  expect(control1.y).toBe(61);
  expect(dragControls.updatedItems.length).toBe(2);

  dragControls.undo();
  expect(mainControl.x).toBe(60);
  expect(mainControl.y).toBe(60);
  expect(control1.x).toBe(60);
  expect(control1.y).toBe(60);

  dragControls.redo();

  //Merge with different followers length
  const dragControls2 = new DragControls(mainControl, new Vector(60, 60), new Vector(61, 61), followers2);
  expect(dragControls.merge(dragControls2)).toBeFalsy();

  //Merge with different main control
  const dragControls3 = new DragControls(mainControl2, new Vector(60, 60), new Vector(61, 61), followers);
  expect(dragControls.merge(dragControls3)).toBeFalsy();

  //Merge with different followers
  const dragControls4 = new DragControls(mainControl, new Vector(60, 60), new Vector(61, 61), followers3);
  expect(dragControls.merge(dragControls4)).toBeFalsy();

  //Merge with same followers, same main control
  const dragControls5 = new DragControls(mainControl, new Vector(60, 60), new Vector(100, 100), followers);
  expect(dragControls.merge(dragControls5)).toBeTruthy();
  expect(dragControls.to.x).toBe(100);
  expect(dragControls.to.y).toBe(100);
});

test("AddKeyframe", () => {
  const keyframes = [new SpeedKeyframe(10, 10), new SpeedKeyframe(5, 5)];
  const addKeyframe = new AddKeyframe(keyframes, new SpeedKeyframe(0, 0));
  expect(keyframes.length).toBe(2);
  addKeyframe.execute();
  expect(keyframes.length).toBe(3);
  expect(keyframes[0].xPos).toBe(0);
  expect(keyframes[0].yPos).toBe(0);
  expect(keyframes[1].xPos).toBe(5);
  expect(keyframes[1].yPos).toBe(5);
  expect(keyframes[2].xPos).toBe(10);
  expect(keyframes[2].yPos).toBe(10);

  addKeyframe.undo();
  expect(keyframes.length).toBe(2);
  addKeyframe.redo();
  expect(keyframes.length).toBe(3);
});
