import { EndPointControl, Control, Segment, construct, traversal, Path, Keyframe } from "./Path";
import { CustomPathConfig } from "../format/Config.test";
import { validate } from "class-validator";
import { instanceToPlain, plainToClass } from "class-transformer";

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

  (c as any).uid = "";
  (c as any).lock = undefined;
  (c as any).visible = 0;
  (c as any).x = Infinity;
  (c as any).y = NaN;
  expect(await validate(c)).toHaveLength(5);
});

test("validate EndPointControl", async () => {
  const c = new EndPointControl(-3.0123456789, 4, 120);

  expect(c.uid).toHaveLength(10);
  expect(c.x).toBe(-3.0123456789);
  expect(c.y).toBe(4);
  expect(c.heading).toBe(120);

  expect(await validate(c)).toHaveLength(0);

  const p = instanceToPlain(c);
  const c2 = plainToClass(EndPointControl, p, { excludeExtraneousValues: true, exposeDefaultValues: true });

  expect(await validate(c2)).toHaveLength(0);
  expect(c2).toStrictEqual(c);

  (c as any).uid = "";
  (c as any).lock = undefined;
  (c as any).visible = 0;
  (c as any).x = Infinity;
  (c as any).y = NaN;
  (c as any).heading_ = 360;
  expect(await validate(c)).toHaveLength(6);
});

test("validate Keyframe", async () => {
  const k = new Keyframe(0.123, 0.456);

  expect(k.uid).toHaveLength(10);
  expect(k.xPos).toBe(0.123);
  expect(k.yPos).toBe(0.456);
  expect(k.followBentRate).toBe(false);

  expect(await validate(k)).toHaveLength(0);

  const p = instanceToPlain(k);
  const k2 = plainToClass(Keyframe, p, { excludeExtraneousValues: true, exposeDefaultValues: true });

  expect(await validate(k2)).toHaveLength(0);
  expect(k2).toStrictEqual(k);

  (k as any).uid = "";
  (k as any).xPos = 1;
  (k as any).yPos = 1.1;
  (k as any).followBentRate = null;
  expect(await validate(k)).toHaveLength(4);
});

test("validate Segment", async () => {
  const controls: [EndPointControl, Control, Control, EndPointControl] = [
    new EndPointControl(0, 1, 2),
    new Control(3, 4),
    new Control(5, 6),
    new EndPointControl(7, 8, 9)
  ];
  const s = new Segment(controls[0], controls.slice(1, -1), controls[3]);

  expect(s.uid).toHaveLength(10);
  expect(s.first).toStrictEqual(controls[0]);
  expect(s.controls).toStrictEqual(controls);
  expect(s.last).toStrictEqual(controls[3]);
  expect(s.speedProfiles).toHaveLength(0);
  
  expect(await validate(s)).toHaveLength(0);
  
  const p = instanceToPlain(s);
  s.controls.forEach(c => expect((c as any).__type).toBeDefined());
  expect(await validate(s)).toHaveLength(0);
  s.controls.forEach(c => expect(delete (c as any).__type));
  const s2 = plainToClass(Segment, p, { excludeExtraneousValues: true, exposeDefaultValues: true });
  
  expect(await validate(s2)).toHaveLength(0);
  expect(s2).toStrictEqual(s);

  (s as any).uid = "";
  (s as any).controls = controls[0];
  (s as any).speedProfiles = new Keyframe(0, 0);
  expect(await validate(s)).toHaveLength(3);
});

test("traversal and construct", () => {
  const i1 = new EndPointControl(1, 0, 0);
  const i2 = new Control(2, 0);
  const i3 = new Control(3, 0);
  const i4 = new EndPointControl(4, 0, 0);
  const i5 = new Control(5, 0);
  const i6 = new Control(6, 0);
  const i7 = new EndPointControl(7, 0, 0);
  const i8 = new Control(8, 0);
  const i9 = new Control(9, 0);
  const i10 = new EndPointControl(10, 0, 0);
  const i11 = new EndPointControl(11, 0, 0);
  const i12 = new Control(12, 0);
  const i13 = new Control(13, 0);
  const i14 = new EndPointControl(14, 0, 0);
  const i15 = new EndPointControl(15, 0, 0);
  const i16 = new EndPointControl(16, 0, 0);
  const i17 = new Control(17, 0);
  const i18 = new Control(18, 0);
  const i19 = new EndPointControl(19, 0, 0);
  const i0 = new Path(new CustomPathConfig(), new Segment(i1, [], i4));

  const i21 = new EndPointControl(21, 0, 0);
  const i22 = new EndPointControl(22, 0, 0);
  const i23 = new Control(23, 0);
  const i24 = new Control(24, 0);
  const i25 = new EndPointControl(25, 0, 0);
  const i26 = new EndPointControl(26, 0, 0);
  const i20 = new Path(new CustomPathConfig(), new Segment(i1, [], i4));

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
  const i3 = new EndPointControl(3, 0, 0);
  const i4 = new Control(4, 0);
  const i5 = new Control(5, 0);
  const i6 = new EndPointControl(6, 0, 0);
  const i7 = new Control(7, 0);
  const i8 = new Control(8, 0);
  const i9 = new Control(9, 0);
  const i10 = new EndPointControl(10, 0, 0);
  const i11 = new EndPointControl(11, 0, 0);
  const i12 = new Control(12, 0);
  const i13 = new EndPointControl(13, 0, 0);
  const i14 = new EndPointControl(14, 0, 0);
  const i15 = new EndPointControl(15, 0, 0);
  const i16 = new Control(16, 0);
  const i17 = new Control(17, 0);
  const i0 = new Path(new CustomPathConfig(), new Segment(i3, [], i6));

  const i19 = new Control(19, 0);
  const i20 = new Control(20, 0);
  const i21 = new EndPointControl(21, 0, 0);
  const i18 = new Path(new CustomPathConfig(), new Segment(i21, [], i21));

  const original = [i0, i1, i2, i3, i4, i5, i6, i7, i8, i9, i10, i11, i12, i13, i14, i15, i16, i17, i18, i19, i20, i21];

  const expected = [i0, i3, i4, i5, i6, i7, i9, i10, i11, i13, i14, i15, i18];

  const removed = construct(original);

  const actual = traversal([i0, i18]);

  expect(removed).toEqual([i1, i2, i8, i12, i16, i17, i19, i20, i21]);
  expect(actual).toEqual(expected);
});
