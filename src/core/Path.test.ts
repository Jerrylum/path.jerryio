import * as MainApp from "./MainApp";
import { EndPointControl, Control, Segment, construct, traversal, Path } from "./Path";
import { CustomPathConfig } from "../format/Config.test";

test('traversal and construct', () => {
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
    i0, i1, i2, i3, i4, i5, i6, i7, i8, i9, i10,
    i11, i12, i13, i14, i15, i16, i17, i18, i19, i20,
    i21, i22, i23, i24, i25, i26];

  const removed = construct(expected);

  const actual = traversal([i0, i20]);

  expect(removed).toEqual([]);
  expect(actual).toEqual(expected);
});
  
test('construct removal', () => {
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

  const original = [
    i0, i1, i2, i3, i4, i5, i6, i7, i8, i9, i10,
    i11, i12, i13, i14, i15, i16, i17, i18, i19, i20,
    i21];

  const expected = [
    i0, i3, i4, i5, i6, i7, i9, i10,
    i11, i13, i14, i15, i18];

  const removed = construct(original);

  const actual = traversal([i0, i18]);

  expect(removed).toEqual([i1, i2, i8, i12, i16, i17, i19, i20, i21]);
  expect(actual).toEqual(expected);
});
