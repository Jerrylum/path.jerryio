import exp from "constants";
import { CustomPathConfig } from "../format/Config.test";
import {
  AddLinearSegment,
  AddCubicSegment,
  ConvertSegment,
  SplitSegment,
  DragControls,
  AddKeyframe,
  MoveKeyframe,
  RemoveKeyframe,
  InsertPaths,
  InsertControls,
  AddPath,
  MovePath,
  MovePathTreeItem,
  RemovePathsAndEndControls,
  RemovePathTreeItems
} from "./Command";
import {
  Control,
  EndControl,
  Keyframe,
  KeyframePos,
  KeyframeList,
  Path,
  Segment,
  SegmentVariant,
  SpeedKeyframe,
  Vector,
  traversal
} from "./Path";

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
  const list = [new SpeedKeyframe(10, 10), new SpeedKeyframe(5, 5)];
  const keyframes = new KeyframeList(() => list, SpeedKeyframe);
  const addKeyframe = new AddKeyframe(keyframes, new SpeedKeyframe(0, 0));
  expect(keyframes.length).toBe(2);
  addKeyframe.execute();
  expect(keyframes.length).toBe(3);
  expect(keyframes.list[0].xPos).toBe(0);
  expect(keyframes.list[0].yPos).toBe(0);
  expect(keyframes.list[1].xPos).toBe(5);
  expect(keyframes.list[1].yPos).toBe(5);
  expect(keyframes.list[2].xPos).toBe(10);
  expect(keyframes.list[2].yPos).toBe(10);

  addKeyframe.undo();
  expect(keyframes.length).toBe(2);
  addKeyframe.redo();
  expect(keyframes.length).toBe(3);
});

test("MoveKeyframe", () => {
  const keyframe = new SpeedKeyframe(0, 0);
  const seg = new Segment(new EndControl(60, 60, 0), new EndControl(61, 60, 90));
  seg["speed"].add(keyframe);
  const seglst = [new Segment(new EndControl(60, 60, 0), new EndControl(61, 60, 90)), seg];
  const movekeyframe = new MoveKeyframe(seglst, "speed", { segment: seg, xPos: 10, yPos: 10 }, keyframe);

  expect(seg["speed"].length).toBe(1);
  expect(seg["speed"].list[0].xPos).toBe(0);
  expect(seg["speed"].list[0].yPos).toBe(0);
  expect(movekeyframe.oldPos).toBeUndefined();
  //dummy call
  movekeyframe.undo();
  movekeyframe.redo();

  movekeyframe.execute();

  expect(seg["speed"].length).toBe(1);
  expect(seg["speed"].list[0].xPos).toBe(10);
  expect(seg["speed"].list[0].yPos).toBe(10);
  expect(movekeyframe.oldPos).toStrictEqual({ segment: seg, xPos: 0, yPos: 0 });

  movekeyframe.undo();
  expect(seg["speed"].length).toBe(1);
  expect(seg["speed"].list[0].xPos).toBe(0);
  expect(seg["speed"].list[0].yPos).toBe(0);

  movekeyframe.redo();
  expect(seg["speed"].length).toBe(1);
  expect(seg["speed"].list[0].xPos).toBe(10);
  expect(seg["speed"].list[0].yPos).toBe(10);

  //merge command with different keyframe
  const movekeyframe2 = new MoveKeyframe(
    seglst,
    "speed",
    { segment: seg, xPos: 10, yPos: 10 },
    new SpeedKeyframe(0, 0)
  );
  expect(movekeyframe.merge(movekeyframe2)).toBeFalsy();

  //merge command with same keyframe but different new position
  const movekeyframe3 = new MoveKeyframe(seglst, "speed", { segment: seg, xPos: 20, yPos: 20 }, keyframe);
  expect(movekeyframe.merge(movekeyframe3)).toBeTruthy();
  expect(movekeyframe.newPos.xPos).toBe(20);
  expect(movekeyframe3.newPos.yPos).toBe(20);
});

test("RemoveKeyframe", () => {
  const keyframe = new SpeedKeyframe(0, 0);
  const seg = new Segment(new EndControl(60, 60, 0), new EndControl(61, 60, 90));
  seg["speed"].add(keyframe);
  const seglst = [new Segment(new EndControl(60, 60, 0), new EndControl(61, 60, 90)), seg];
  const removekeyframe = new RemoveKeyframe(seglst, "speed", keyframe);

  //dummy call
  expect(removekeyframe.oldIdx).toBe(-1);
  expect(removekeyframe.segment).toBeUndefined();
  removekeyframe.undo();
  removekeyframe.redo();

  expect(seg["speed"].length).toBe(1);
  removekeyframe.execute();
  expect(seg["speed"].length).toBe(0);

  removekeyframe.undo();
  expect(seg["speed"].length).toBe(1);

  removekeyframe.redo();
  expect(seg["speed"].length).toBe(0);
});

test("InsertPath", () => {
  const i1 = new EndControl(1, 0, 0);
  const i2 = new Control(2, 0);
  const i3 = new Control(3, 0);
  const i4 = new EndControl(4, 0, 0);
  const i5 = new EndControl(5, 0, 0);
  const i6 = new EndControl(6, 0, 0);
  const path = new Path(new CustomPathConfig(), new Segment(i5, i6));
  const path2 = new Path(new CustomPathConfig(), new Segment(i1, i2, i3, i4));
  const lst = [path];

  //invalid index dummy calls
  const insertPath = new InsertPaths(lst, -1, [path2]);
  const insertPath2 = new InsertPaths(lst, 3, [path2]);
  expect(insertPath.execute()).toBeFalsy();
  expect(insertPath2.execute()).toBeFalsy();

  const insertPath3 = new InsertPaths(lst, 0, [path2]);
  expect(insertPath3.addedItems.length).toBe(0);
  expect(traversal(lst).length).toBe(3);
  insertPath3.execute();
  expect(insertPath3.addedItems.length).toBe(5);
  expect(traversal(lst).length).toBe(8);

  insertPath3.undo();
  expect(traversal(lst).length).toBe(3);

  insertPath3.redo();
  expect(traversal(lst).length).toBe(8);
});

test("InsertControl", () => {
  const i1 = new EndControl(1, 0, 0);
  const i2 = new Control(2, 0);
  const i3 = new Control(3, 0);
  const i4 = new EndControl(4, 0, 0);
  const i5 = new EndControl(5, 0, 0);
  const i6 = new EndControl(6, 0, 0);
  const pathtree = [i1, i4];

  //invalid pathtree without path
  const insertControl = new InsertControls(pathtree, 1, [i5]);
  expect(insertControl.execute()).toBeFalsy();
  //invalid index
  const insertControl2 = new InsertControls(pathtree, -1, [i5]);
  expect(insertControl2.execute()).toBeFalsy();

  const lstpath = [new Path(new CustomPathConfig(), new Segment(i1, i2, i3, i4))];
  const insertControl3 = new InsertControls(traversal(lstpath), 1, [i5, i6]);
  expect(traversal(lstpath).length).toBe(5); // path, i1, i2, i3, i4
  expect(insertControl3.execute()).toBeTruthy();
  expect(traversal(lstpath).length).toBe(7); // path, i1, i5, i6, i2, i3, i4
  expect(insertControl3.addedItems.length).toBe(2);

  insertControl3.undo();
  expect(traversal(lstpath).length).toBe(5);

  insertControl3.redo();
  expect(traversal(lstpath).length).toBe(7);

  const lstpath2 = [new Path(new CustomPathConfig(), new Segment(i1, i2, i3, i4))];
  const insertControl4 = new InsertControls(traversal(lstpath2), 3, [i5, i6]);
  expect(insertControl4.originalStructure.length).toBe(0);
  expect(insertControl4.modifiedStructure.length).toBe(0);
  expect(traversal(lstpath2).length).toBe(5); // path, i1, i2, i3, i4
  expect(insertControl4.execute()).toBeTruthy();
  expect(traversal(lstpath2).length).toBe(5); // path, i1, i5, i6, i4
  expect(insertControl4.removedItems.length).toBe(2);
  expect(insertControl4.addedItems.length).toBe(2);
  expect(insertControl4.originalStructure.length).toBe(1);
  expect(insertControl4.modifiedStructure.length).toBe(1);
});

test("AddPath", () => {
  const i1 = new EndControl(1, 0, 0);
  const i2 = new Control(2, 0);
  const i3 = new Control(3, 0);
  const i4 = new EndControl(4, 0, 0);
  const i5 = new EndControl(5, 0, 0);
  const i6 = new EndControl(6, 0, 0);
  const path = new Path(new CustomPathConfig(), new Segment(i5, i6));
  const path2 = new Path(new CustomPathConfig(), new Segment(i1, i2, i3, i4));
  const lst = [path];

  const addPath = new AddPath(lst, path2);
  expect(addPath.addedItems.length).toBe(0);
  expect(traversal(lst).length).toBe(3);
  addPath.execute();
  expect(addPath.addedItems.length).toBe(5);
  expect(traversal(lst).length).toBe(8);
});

test("MovePath", () => {
  const i1 = new EndControl(5, 0, 0);
  const i2 = new EndControl(6, 0, 0);
  const lstpath = [
    new Path(new CustomPathConfig(), new Segment(i1, i2)),
    new Path(new CustomPathConfig()),
    new Path(new CustomPathConfig())
  ];

  // invalid from index
  const movePath = new MovePath(lstpath, -1, 2);
  expect(movePath.execute()).toBeFalsy();
  const movePath2 = new MovePath(lstpath, 10, 2);
  expect(movePath2.execute()).toBeFalsy();
  // invalid to index
  const movePath3 = new MovePath(lstpath, 0, -1);
  expect(movePath3.execute()).toBeFalsy();
  const movePath4 = new MovePath(lstpath, 0, 10);
  expect(movePath4.execute()).toBeFalsy();
  movePath4.undo();

  const movePath5 = new MovePath(lstpath, 0, 2);
  expect(movePath5.updatedItems.length).toBe(0);
  expect(movePath5.execute()).toBeTruthy();
  expect(movePath5.updatedItems.length).toBe(1);
  expect(lstpath[2].segments.length).toBe(1);

  movePath5.undo();
  expect(lstpath[0].segments.length).toBe(1);
  expect(lstpath[2].segments.length).toBe(0);

  movePath5.redo();
  expect(lstpath[0].segments.length).toBe(0);
  expect(lstpath[2].segments.length).toBe(1);
});

test("MovePathTreeItem", () => {
  const i1 = new EndControl(1, 0, 0);
  const i2 = new Control(2, 0);
  const i3 = new Control(3, 0);
  const i4 = new EndControl(4, 0, 0);
  const pathtree = [i1, i4];

  //invalid pathtree without path
  const movePathTreeItem = new MovePathTreeItem(pathtree, 1, 1);
  expect(movePathTreeItem.execute()).toBeFalsy();
  //invalid from index
  const movePathTreeItem2 = new MovePathTreeItem(pathtree, -1, 2);
  expect(movePathTreeItem2.execute()).toBeFalsy();
  //invalid to index
  const movePathTreeItem3 = new MovePathTreeItem(pathtree, 0, -1);
  expect(movePathTreeItem3.execute()).toBeFalsy();

  const lstpath = [new Path(new CustomPathConfig(), new Segment(i1, i2, i3, i4))];
  const movePathTreeItem4 = new MovePathTreeItem(traversal(lstpath), 2, 4);
  expect(traversal(lstpath).length).toBe(5); // path, i1, i2, i3, i4
  expect(movePathTreeItem4.removedItems.length).toBe(0);
  expect(movePathTreeItem4.updatedItems.length).toBe(0);
  expect(movePathTreeItem4.originalStructure.length).toBe(0);
  expect(movePathTreeItem4.modifiedStructure.length).toBe(0);
  expect(movePathTreeItem4.execute()).toBeTruthy();
  expect(traversal(lstpath).length).toBe(3); // path, i1, i4
  expect(movePathTreeItem4.removedItems.length).toBe(2);
  expect(movePathTreeItem4.updatedItems.length).toBe(1);
  expect(movePathTreeItem4.originalStructure.length).toBe(1);
  expect(movePathTreeItem4.modifiedStructure.length).toBe(1);

  movePathTreeItem4.undo();
  expect(traversal(lstpath).length).toBe(5);

  movePathTreeItem4.redo();
  expect(traversal(lstpath).length).toBe(3);
});

test("RemovePathsAndEndControls", () => {
  const i1 = new EndControl(1, 0, 0);
  const i2 = new Control(2, 0);
  const i3 = new Control(3, 0);
  const i4 = new EndControl(4, 0, 0);
  const i5 = new Control(6, 0);
  const i6 = new Control(7, 0);
  const i7 = new EndControl(8, 0, 0);
  const lstseg = [new Segment(i1, i2, i3, i4), new Segment(i4, i5, i6, i7)];
  // const keyframe = new SpeedKeyframe(0, 0);
  // lstseg[0]["speed"].add(keyframe);
  const lstpath = [new Path(new CustomPathConfig()), new Path(new CustomPathConfig(), ...lstseg)];
  // remove end control that is the first control of segment but not the first segment
  const pathtree = traversal(lstpath); // path1, path2, i1, i2, i3, i4, i5, i6, i7
  expect(pathtree.length).toBe(9);
  const removePathsAndEndControls = new RemovePathsAndEndControls(lstpath, [pathtree[5]]);
  expect(removePathsAndEndControls.execute()).toBeTruthy();
  expect(traversal(lstpath).length).toBe(6); // path1, path2, i1, i2, i6, i7
  expect(removePathsAndEndControls.removedItems.length).toBe(3);

  removePathsAndEndControls.undo();
  expect(traversal(lstpath).length).toBe(9);

  removePathsAndEndControls.redo();
  expect(traversal(lstpath).length).toBe(6);

  // invalid pathtree without path
  const removePathsAndEndControls2 = new RemovePathsAndEndControls([], []);
  expect(removePathsAndEndControls2.execute()).toBeFalsy();

  // remove path via its uid
  const pathtree2 = traversal(lstpath); // path1, path2, i1, i2, i6, i7
  const path1UID = pathtree2[0].uid;
  const removePathsAndEndControls3 = new RemovePathsAndEndControls(lstpath, [path1UID]);
  expect(removePathsAndEndControls3.execute()).toBeTruthy();
  expect(traversal(lstpath).length).toBe(5); // path2, i1, i2, i6, i7

  removePathsAndEndControls3.undo();
  expect(traversal(lstpath).length).toBe(6);

  removePathsAndEndControls3.redo();
  expect(traversal(lstpath).length).toBe(5);

  // remove end control that is the first control of segment and is the first segment
  const pathtree3 = traversal(lstpath); // path2, i1, i2, i6, i7
  const removePathsAndEndControls4 = new RemovePathsAndEndControls(lstpath, [pathtree3[1]]);
  expect(removePathsAndEndControls4.execute()).toBeTruthy();
  expect(traversal(lstpath).length).toBe(1); // path2

  removePathsAndEndControls4.undo();
  expect(traversal(lstpath).length).toBe(5);

  removePathsAndEndControls4.redo();
  expect(traversal(lstpath).length).toBe(1);

  const lstseg2 = [new Segment(i1, i2, i3, i4), new Segment(i4, i5, i6, i7)];
  const lstpath2 = [new Path(new CustomPathConfig()), new Path(new CustomPathConfig(), ...lstseg2)];
  // remove end control that is the last control of segment
  const pathtree4 = traversal(lstpath2); // path1, path2, i1, i2, i3, i4, i5, i6, i7
  const removePathsAndEndControls5 = new RemovePathsAndEndControls(lstpath2, [pathtree4[8]]);
  expect(removePathsAndEndControls5.execute()).toBeTruthy();
  expect(traversal(lstpath2).length).toBe(6); // path1, path2, i1, i2, i3, i4

  // remove a control that is not the first or last control of segment
  const pathtree5 = traversal(lstpath2); // path1, path2, i1, i2, i3, i4
  const removePathsAndEndControls6 = new RemovePathsAndEndControls(lstpath2, [pathtree5[3]]); // try to remove a control, not end control
  expect(removePathsAndEndControls6.execute()).toBeFalsy();
});

test("RemovePathTreeItems", () => {
  const i1 = new EndControl(1, 0, 0);
  const i2 = new Control(2, 0);
  const i3 = new Control(3, 0);
  const i4 = new EndControl(4, 0, 0);
  const i5 = new Control(6, 0);
  const i6 = new Control(7, 0);
  const i7 = new EndControl(8, 0, 0);
  const lstseg = [new Segment(i1, i2, i3, i4), new Segment(i4, i5, i6, i7)];
  // const keyframe = new SpeedKeyframe(0, 0);
  // lstseg[0]["speed"].add(keyframe);
  const lstpath = [new Path(new CustomPathConfig()), new Path(new CustomPathConfig(), ...lstseg)];
  // remove end control that is the first control of segment but not the first segment
  const pathtree = traversal(lstpath); // path1, path2, i1, i2, i3, i4, i5, i6, i7
  expect(pathtree.length).toBe(9);
  const removePathTreeItems = new RemovePathTreeItems(lstpath, [pathtree[5]]);
  expect(removePathTreeItems.originalStructure.length).toBe(0);
  expect(removePathTreeItems.modifiedStructure.length).toBe(0);
  expect(removePathTreeItems.execute()).toBeTruthy();
  expect(traversal(lstpath).length).toBe(6); // path1, path2, i1, i2, i6, i7
  expect(removePathTreeItems.removedItems.length).toBe(3);
  expect(removePathTreeItems.originalStructure.length).toBe(2);
  expect(removePathTreeItems.modifiedStructure.length).toBe(2);

  removePathTreeItems.undo();
  expect(traversal(lstpath).length).toBe(9);

  removePathTreeItems.redo();
  expect(traversal(lstpath).length).toBe(6);
});
