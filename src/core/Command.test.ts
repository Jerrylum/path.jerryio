import { CustomPathConfig } from "../format/Config.test";
import { AddSegment } from "./Command";
import { Control, EndControl, Path, Segment, SegmentVariant } from "./Path";

test("AddSegment", () => {
  const path = new Path(new CustomPathConfig());
  const addSegment = new AddSegment(path, new EndControl(60, 60, 0), SegmentVariant.Linear);
  expect(path.segments.length).toBe(0);
  addSegment.execute();
  expect(path.segments.length).toBe(1);
  expect(addSegment.segment).not.toBeUndefined();
  expect(addSegment.addedItems.length).toBe(2);
  expect(addSegment.addedItems).toStrictEqual(addSegment.segment?.controls);

  path.segments = [];
  const addSegment2 = new AddSegment(path, new EndControl(60, 60, 0), SegmentVariant.Cubic);
  expect(path.segments.length).toBe(0);
  addSegment2.execute();
  expect(path.segments.length).toBe(1);
  expect(addSegment2.segment).not.toBeUndefined();
  expect(addSegment2.addedItems.length).toBe(4);
  expect(addSegment2.addedItems).toStrictEqual(addSegment2.segment?.controls);

  path.segments = [new Segment(new EndControl(60, 60, 0), new EndControl(61, 60, 90))];
  const addSegment3 = new AddSegment(path, new EndControl(60, 60, 0), SegmentVariant.Linear);
  expect(path.segments.length).toBe(1);
  addSegment3.execute();
  expect(path.segments.length).toBe(2);
  expect(addSegment3.segment).not.toBeUndefined();
  expect(addSegment3.addedItems.length).toBe(1);
  expect(addSegment3.segment?.controls[0]).toStrictEqual(
    path.segments[0].controls[path.segments[0].controls.length - 1]
  );
  expect(addSegment3.addedItems[0]).toStrictEqual(addSegment3.segment?.controls[1]);

  path.segments = [new Segment(new EndControl(60, 60, 0), new EndControl(61, 60, 90))];
  const addSegment4 = new AddSegment(path, new EndControl(60, 60, 0), SegmentVariant.Cubic);
  expect(path.segments.length).toBe(1);
  addSegment4.execute();
  expect(path.segments.length).toBe(2);
  expect(addSegment4.segment).not.toBeUndefined();
  expect(addSegment4.addedItems.length).toBe(3);
  expect(addSegment4.segment?.controls[0]).toStrictEqual(
    path.segments[0].controls[path.segments[0].controls.length - 1]
  );
  expect(addSegment4.addedItems[0]).toStrictEqual(addSegment4.segment?.controls[1]);
  expect(addSegment4.addedItems[1]).toStrictEqual(addSegment4.segment?.controls[2]);
  expect(addSegment4.addedItems[2]).toStrictEqual(addSegment4.segment?.controls[3]);

  path.segments = [
    new Segment(new EndControl(60, 60, 0), new Control(0, 0), new Control(0, 0), new EndControl(61, 60, 90))
  ];
  const addSegment5 = new AddSegment(path, new EndControl(60, 60, 0), SegmentVariant.Cubic);
  expect(path.segments.length).toBe(1);
  addSegment5.execute();
  expect(path.segments.length).toBe(2);
  expect(addSegment5.segment).not.toBeUndefined();
  expect(addSegment5.addedItems.length).toBe(3);
  expect(addSegment5.segment?.controls[0]).toStrictEqual(
    path.segments[0].controls[path.segments[0].controls.length - 1]
  );
  expect(addSegment5.addedItems[0]).toStrictEqual(addSegment5.segment?.controls[1]);
  expect(addSegment5.addedItems[1]).toStrictEqual(addSegment5.segment?.controls[2]);
  expect(addSegment5.addedItems[2]).toStrictEqual(addSegment5.segment?.controls[3]);

  addSegment5.undo();
  expect(path.segments.length).toBe(1);
  addSegment5.redo();
  expect(path.segments.length).toBe(2);
});
