import {
  EndControl,
  Control,
  Segment,
  construct,
  traversal,
  Path,
  SpeedKeyframe,
  relatedPaths,
  Vector,
  createStructureMemento,
  applyStructureMemento,
  LookaheadKeyframe
} from "./Path";
import { CustomPathConfig } from "../format/Config.test";
import { validate } from "class-validator";
import { instanceToPlain, plainToClass, plainToClassFromExist } from "class-transformer";
import { CustomFormat } from "../format/Format.test";

test("Vector manipulation functions", () => {
  const v1 = new Vector(1, 2);

  expect(v1.x).toBe(1);
  expect(v1.y).toBe(2);

  const v2 = v1.add(new Vector(3, 4));
  expect(v1.x).toBe(1);
  expect(v1.y).toBe(2);
  expect(v2.x).toBe(4);
  expect(v2.y).toBe(6);

  const v3 = v1.add(4);
  expect(v1.x).toBe(1);
  expect(v1.y).toBe(2);
  expect(v3.x).toBe(5);
  expect(v3.y).toBe(6);

  const v4 = v1.subtract(new Vector(3, 4));
  expect(v1.x).toBe(1);
  expect(v1.y).toBe(2);
  expect(v4.x).toBe(-2);
  expect(v4.y).toBe(-2);

  const v5 = v1.subtract(4);
  expect(v1.x).toBe(1);
  expect(v1.y).toBe(2);
  expect(v5.x).toBe(-3);
  expect(v5.y).toBe(-2);

  const v6 = v1.multiply(new Vector(3, 4));
  expect(v1.x).toBe(1);
  expect(v1.y).toBe(2);
  expect(v6.x).toBe(3);
  expect(v6.y).toBe(8);

  const v7 = v1.multiply(4);
  expect(v1.x).toBe(1);
  expect(v1.y).toBe(2);
  expect(v7.x).toBe(4);
  expect(v7.y).toBe(8);

  const v8 = v1.divide(new Vector(3, 4));
  expect(v1.x).toBe(1);
  expect(v1.y).toBe(2);
  expect(v8.x).toBe(1 / 3);
  expect(v8.y).toBe(2 / 4);

  const v9 = v1.divide(4);
  expect(v1.x).toBe(1);
  expect(v1.y).toBe(2);
  expect(v9.x).toBe(1 / 4);
  expect(v9.y).toBe(2 / 4);
});

test("validate Control", async () => {
  const c = new Control(-3.0123456789, 4);

  expect(c.uid).toHaveLength(10);
  expect(c.x).toBe(-3.0123456789);
  expect(c.y).toBe(4);

  expect(await validate(c)).toHaveLength(0);

  const p = instanceToPlain(c);
  const c2 = plainToClass(Control, p, { excludeExtraneousValues: true, exposeDefaultValues: true });

  expect(await validate(c2)).toHaveLength(0);
  expect(c2).toStrictEqual(c);

  (c as any).uid = "123456789-";
  expect(await validate(c)).toHaveLength(1);

  (c as any).uid = "";
  (c as any).lock = undefined;
  (c as any).visible = 0;
  (c as any).x = Infinity;
  (c as any).y = NaN;
  expect(await validate(c)).toHaveLength(5);
});

test("validate EndControl", async () => {
  const c = new EndControl(-3.0123456789, 4, 120);

  expect(c.uid).toHaveLength(10);
  expect(c.x).toBe(-3.0123456789);
  expect(c.y).toBe(4);
  expect(c.heading).toBe(120);

  expect(await validate(c)).toHaveLength(0);

  const p = instanceToPlain(c);
  const c2 = plainToClass(EndControl, p, { excludeExtraneousValues: true, exposeDefaultValues: true });

  expect(await validate(c2)).toHaveLength(0);
  expect(c2).toStrictEqual(c);

  (c as any).uid = "123456789-";
  expect(await validate(c)).toHaveLength(1);

  (c as any).uid = "";
  (c as any).lock = undefined;
  (c as any).visible = 0;
  (c as any).x = Infinity;
  (c as any).y = NaN;
  (c as any).heading_ = 360;
  expect(await validate(c)).toHaveLength(6);
});

test("validate SpeedKeyframe", async () => {
  const k = new SpeedKeyframe(0.123, 0.456);

  expect(k.uid).toHaveLength(10);
  expect(k.xPos).toBe(0.123);
  expect(k.yPos).toBe(0.456);
  expect(k.followBentRate).toBe(false);

  expect(await validate(k)).toHaveLength(0);

  const p = instanceToPlain(k);
  const k2 = plainToClass(SpeedKeyframe, p, { excludeExtraneousValues: true, exposeDefaultValues: true });

  expect(await validate(k2)).toHaveLength(0);
  expect(k2).toStrictEqual(k);

  (k as any).uid = "123456789-";
  expect(await validate(k)).toHaveLength(1);

  (k as any).uid = "";
  (k as any).xPos = 1;
  (k as any).yPos = 1.1;
  (k as any).followBentRate = null;
  expect(await validate(k)).toHaveLength(4);
});

test("validate LookaheadKeyframe", async () => {
  const k = new LookaheadKeyframe(0.123, 0.456);

  expect(k.uid).toHaveLength(10);
  expect(k.xPos).toBe(0.123);
  expect(k.yPos).toBe(0.456);

  expect(await validate(k)).toHaveLength(0);

  const p = instanceToPlain(k);
  const k2 = plainToClass(LookaheadKeyframe, p, { excludeExtraneousValues: true, exposeDefaultValues: true });

  expect(await validate(k2)).toHaveLength(0);
  expect(k2).toStrictEqual(k);

  (k as any).uid = "123456789-";
  expect(await validate(k)).toHaveLength(1);

  (k as any).uid = "";
  (k as any).xPos = 1;
  (k as any).yPos = 1.1;
  expect(await validate(k)).toHaveLength(3);
});

test("validate Segment", async () => {
  const controls: [EndControl, Control, Control, EndControl] = [
    new EndControl(0, 1, 2),
    new Control(3, 4),
    new Control(5, 6),
    new EndControl(7, 8, 9)
  ];
  const s = new Segment(...controls);

  expect(s.uid).toHaveLength(10);
  expect(s.first).toStrictEqual(controls[0]);
  expect(s.controls).toStrictEqual(controls);
  expect(s.last).toStrictEqual(controls[3]);
  expect(s.speed).toHaveLength(0);
  expect(s.lookahead).toHaveLength(0);

  expect(await validate(s)).toHaveLength(0);

  const p = instanceToPlain(s);
  s.controls.forEach(c => expect((c as any).__type).toBeDefined());
  expect(await validate(s)).toHaveLength(0);
  s.controls.forEach(c => expect(delete (c as any).__type));
  const s2 = plainToClass(Segment, p, { excludeExtraneousValues: true, exposeDefaultValues: true });

  expect(await validate(s2)).toHaveLength(0);
  expect(instanceToPlain(s2)).toStrictEqual(instanceToPlain(s));

  (s as any).uid = "123456789-";
  expect(await validate(s)).toHaveLength(1);

  (s as any).uid = "";
  (s as any).controls = controls[0];
  (s as any).speed_ = new SpeedKeyframe(0, 0);
  (s as any).lookahead_ = new LookaheadKeyframe(0, 0);
  expect(await validate(s)).toHaveLength(4);
});

test("validate Path", async () => {
  const c = new CustomPathConfig();
  const s = new Segment(new EndControl(0, 1, 2), new Control(3, 4), new Control(5, 6), new EndControl(7, 8, 9));
  const p = new Path(c, s);

  expect(p.uid).toHaveLength(10);
  expect(p.lock).toBe(false);
  expect(p.visible).toBe(true);
  expect(p.pc).toStrictEqual(c);
  expect(p.name).toBe("Path");
  expect(p.segments).toStrictEqual([s]);

  expect(await validate(p)).toHaveLength(0);

  const p2 = new CustomFormat().createPath();
  plainToClassFromExist(p2, instanceToPlain(p), { excludeExtraneousValues: true, exposeDefaultValues: true });

  expect(await validate(p2)).toHaveLength(0);
  // expect(p2).toStrictEqual(p);
  expect(p.uid).toBe(p2.uid);
  expect(p.lock).toStrictEqual(p2.lock);
  expect(p.visible).toBe(p2.visible);
  // expect(p.pc).toStrictEqual(p2.pc);
  expect(p.name).toBe(p2.name);
  p.segments.forEach(s => s.controls.forEach(c => expect(delete (c as any).__type)));
  expect(instanceToPlain(p2)).toStrictEqual(instanceToPlain(p));

  (p as any).uid = "123456789-";
  expect(await validate(p)).toHaveLength(1);

  (p as any).uid = "";
  (p as any).lock = undefined;
  (p as any).visible = 0;
  (p as any).pc = null;
  (p as any).name = "";
  (p as any).segments = s;
  expect(await validate(p)).toHaveLength(6);

  (p as any).pc = [c, c];
  expect(await validate(p)).toHaveLength(6);
});

test("traversal and construct", () => {
  const i1 = new EndControl(1, 0, 0);
  const i2 = new Control(2, 0);
  const i3 = new Control(3, 0);
  const i4 = new EndControl(4, 0, 0);
  const i5 = new Control(5, 0);
  const i6 = new Control(6, 0);
  const i7 = new EndControl(7, 0, 0);
  const i8 = new Control(8, 0);
  const i9 = new Control(9, 0);
  const i10 = new EndControl(10, 0, 0);
  const i11 = new EndControl(11, 0, 0);
  const i12 = new Control(12, 0);
  const i13 = new Control(13, 0);
  const i14 = new EndControl(14, 0, 0);
  const i15 = new EndControl(15, 0, 0);
  const i16 = new EndControl(16, 0, 0);
  const i17 = new Control(17, 0);
  const i18 = new Control(18, 0);
  const i19 = new EndControl(19, 0, 0);
  const i0 = new Path(new CustomPathConfig(), new Segment(i1, i4));

  const i21 = new EndControl(21, 0, 0);
  const i22 = new EndControl(22, 0, 0);
  const i23 = new Control(23, 0);
  const i24 = new Control(24, 0);
  const i25 = new EndControl(25, 0, 0);
  const i26 = new EndControl(26, 0, 0);
  const i20 = new Path(new CustomPathConfig(), new Segment(i1, i4));

  const expected = [
    i0,
    i1,
    i2,
    i3,
    i4,
    i5,
    i6,
    i7,
    i8,
    i9,
    i10,
    i11,
    i12,
    i13,
    i14,
    i15,
    i16,
    i17,
    i18,
    i19,
    i20,
    i21,
    i22,
    i23,
    i24,
    i25,
    i26
  ];

  const removed = construct(expected);

  const actual = traversal([i0, i20]);

  expect(removed).toEqual([]);
  expect(actual).toEqual(expected);
});

test("construct removal", () => {
  const i1 = new Control(1, 0);
  const i2 = new Control(2, 0);
  const i3 = new EndControl(3, 0, 0);
  const i4 = new Control(4, 0);
  const i5 = new Control(5, 0);
  const i6 = new EndControl(6, 0, 0);
  const i7 = new Control(7, 0);
  const i8 = new Control(8, 0);
  const i9 = new Control(9, 0);
  const i10 = new EndControl(10, 0, 0);
  const i11 = new EndControl(11, 0, 0);
  const i12 = new Control(12, 0);
  const i13 = new EndControl(13, 0, 0);
  const i14 = new EndControl(14, 0, 0);
  const i15 = new EndControl(15, 0, 0);
  const i16 = new Control(16, 0);
  const i17 = new Control(17, 0);
  const i0 = new Path(new CustomPathConfig(), new Segment(i3, i6));

  const i19 = new Control(19, 0);
  const i20 = new Control(20, 0);
  const i21 = new EndControl(21, 0, 0);
  const i18 = new Path(new CustomPathConfig(), new Segment(i21, i21));

  const original = [i0, i1, i2, i3, i4, i5, i6, i7, i8, i9, i10, i11, i12, i13, i14, i15, i16, i17, i18, i19, i20, i21];

  const expected = [i0, i3, i4, i5, i6, i7, i9, i10, i11, i13, i14, i15, i18];

  const removed = construct(original);

  const actual = traversal([i0, i18]);

  expect(removed).toEqual([i1, i2, i8, i12, i16, i17, i19, i20, i21]);
  expect(actual).toEqual(expected);
});

test("structure memento", () => {
  const i3 = new EndControl(3, 0, 0);
  const i4 = new Control(4, 0);
  const i5 = new Control(5, 0);
  const i6 = new EndControl(6, 0, 0);
  const i7 = new Control(7, 0);
  const i9 = new Control(9, 0);
  const i10 = new EndControl(10, 0, 0);
  const i11 = new EndControl(11, 0, 0);
  const i13 = new EndControl(13, 0, 0);
  const i14 = new EndControl(14, 0, 0);
  const i15 = new EndControl(15, 0, 0);
  const i0 = new Path(new CustomPathConfig(), new Segment(i3, i6));

  construct([i0, i3, i4, i5, i6, i7, i9, i10, i11, i13, i14, i15]);

  const paths = [i0];
  const memento = createStructureMemento(paths);

  expect(i0.segments.length).toBe(6);

  const expected = i0.segments.slice();
  i0.segments = [];

  applyStructureMemento(memento);

  expect(i0.segments).toEqual(expected);
});

test("relatedPaths", () => {
  const c = new CustomPathConfig();

  const i0 = new EndControl(0, 0, 0);
  const i1 = new Control(1, 0);
  const i2 = new Control(2, 0);
  const i3 = new EndControl(3, 0, 0);
  const i4 = new EndControl(4, 0, 0);
  const i5 = new EndControl(5, 0, 0);
  const i6 = new Control(6, 0);
  const i7 = new Control(7, 0);
  const i8 = new EndControl(8, 0, 0);
  const p1 = new Path(new CustomPathConfig(), new Segment(i0, i1, i2, i3), new Segment(i3, i4));
  const p2 = new Path(new CustomPathConfig(), new Segment(i5, i6, i7, i8));

  expect(relatedPaths([p1, p2], [i0])).toEqual([p1]);
  expect(relatedPaths([p1, p2], [i1])).toEqual([p1]);
  expect(relatedPaths([p1, p2], [i5])).toEqual([p2]);
  expect(relatedPaths([p1, p2], [i6])).toEqual([p2]);
  expect(relatedPaths([p1, p2], [i0, i2])).toEqual([p1]);
  expect(relatedPaths([p1, p2], [i1, i2])).toEqual([p1]);
  expect(relatedPaths([p1, p2], [i5, i7])).toEqual([p2]);
  expect(relatedPaths([p1, p2], [i6, i7])).toEqual([p2]);
  expect(relatedPaths([p1, p2], [i0, i2, i4])).toEqual([p1]);
  expect(relatedPaths([p1, p2], [i1, i2, i4])).toEqual([p1]);
  expect(relatedPaths([p1, p2], [i5, i7, i8])).toEqual([p2]);
  expect(relatedPaths([p1, p2], [i0, i5])).toEqual([p1, p2]);
});
