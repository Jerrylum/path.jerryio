import { Unit, UnitOfAngle, UnitOfLength } from "../core/Unit";
import { Zero, CodePointBuffer, isDelimiter, isSafeDelimiter, BooleanT, DecimalPoint, Digit1To9, Digit, DoubleQuoteString, Frac, Int, Minus, NegativeInt, NumberT, PositiveInt, SingleQuoteString, StringT, NumberUOL, Operator, CloseBracket, OpenBracket, Expression, Computation, Computable, NumberWithUnit, NumberUOA } from "./Tokens";

function cpb(s: string): CodePointBuffer {
  return new CodePointBuffer(s);
}

test("Test token delimiter methods", () => {
  expect(true).toBe(true);

  Zero.parse(cpb("0"));
});

test('Token delimiter methods', () => {
  expect(isDelimiter(' ')).toBe(true);
  expect(isDelimiter(null)).toBe(true);
  expect(isDelimiter('\'')).toBe(false);
  expect(isSafeDelimiter(null)).toBe(true);
  expect(isSafeDelimiter(' ')).toBe(true);
  expect(isSafeDelimiter(':')).toBe(true);
  expect(isSafeDelimiter(',')).toBe(true);
  expect(isSafeDelimiter('\'')).toBe(false);
});

test('BooleanT valid case', () => {
  const t = BooleanT.parse(cpb("True"));
  if (!t) throw new Error("t is null");
  expect("True").toBe(t.value);
  expect(true).toBe(t.bool);

  expect(new BooleanT("True", true)).toStrictEqual(BooleanT.parse(cpb("True")));
  expect(new BooleanT("true", true)).toStrictEqual(BooleanT.parse(cpb("true")));
  expect(new BooleanT("False", false)).toStrictEqual(BooleanT.parse(cpb("False")));
  expect(new BooleanT("false", false)).toStrictEqual(BooleanT.parse(cpb("false")));
  expect(new BooleanT("True", true)).toStrictEqual(BooleanT.parse(cpb("True ")));
  expect(new BooleanT("TrUe", true)).toStrictEqual(BooleanT.parse(cpb("TrUe ")));
  expect(new BooleanT("fAlse", false)).toStrictEqual(BooleanT.parse(cpb("fAlse")));
});

test('BooleanT invalid case', () => {
  expect(BooleanT.parse(cpb(""))).toBeNull();
  expect(BooleanT.parse(cpb("1"))).toBeNull();
  expect(BooleanT.parse(cpb("0"))).toBeNull();
  expect(BooleanT.parse(cpb(" "))).toBeNull();
  expect(BooleanT.parse(cpb(" True"))).toBeNull();
  expect(BooleanT.parse(cpb(""))).toBeNull();
});

test('DecimalPoint valid case', () => {
  expect(new DecimalPoint()).toStrictEqual(DecimalPoint.parse(cpb(".")));
  expect(new DecimalPoint()).toStrictEqual(DecimalPoint.parse(cpb(". ")));
  expect(new DecimalPoint()).toStrictEqual(DecimalPoint.parse(cpb(".a")));
  expect(new DecimalPoint()).toStrictEqual(DecimalPoint.parse(cpb(".123")));
});

test('DecimalPoint invalid case', () => {
  expect(DecimalPoint.parse(cpb(" ."))).toBeNull();
  expect(DecimalPoint.parse(cpb("0"))).toBeNull();
  expect(DecimalPoint.parse(cpb(" "))).toBeNull();
  expect(DecimalPoint.parse(cpb("a"))).toBeNull();
  expect(DecimalPoint.parse(cpb(""))).toBeNull();
  expect(DecimalPoint.parse(cpb("1 "))).toBeNull();
  expect(DecimalPoint.parse(cpb("-1"))).toBeNull();
  expect(DecimalPoint.parse(cpb("1"))).toBeNull();
});

test('Digit1To9 valid case', () => {
  expect(new Digit1To9('1')).toStrictEqual(Digit1To9.parse(cpb("1")));
  expect(new Digit1To9('2')).toStrictEqual(Digit1To9.parse(cpb("2")));
  expect(new Digit1To9('3')).toStrictEqual(Digit1To9.parse(cpb("3")));
  expect(new Digit1To9('4')).toStrictEqual(Digit1To9.parse(cpb("4")));
  expect(new Digit1To9('5')).toStrictEqual(Digit1To9.parse(cpb("5")));
  expect(new Digit1To9('6')).toStrictEqual(Digit1To9.parse(cpb("6")));
  expect(new Digit1To9('7')).toStrictEqual(Digit1To9.parse(cpb("7")));
  expect(new Digit1To9('8')).toStrictEqual(Digit1To9.parse(cpb("8")));
  expect(new Digit1To9('9')).toStrictEqual(Digit1To9.parse(cpb("9")));
  expect(new Digit1To9('1')).toStrictEqual(Digit1To9.parse(cpb("10")));
  expect(new Digit1To9('1')).toStrictEqual(Digit1To9.parse(cpb("1 ")));
});

test('Digit1To9 invalid case', () => {
  expect(Digit1To9.parse(cpb("0"))).toBeNull();
  expect(Digit1To9.parse(cpb(" 1"))).toBeNull();
  expect(Digit1To9.parse(cpb("a"))).toBeNull();
  expect(Digit1To9.parse(cpb("A"))).toBeNull();
  expect(Digit1To9.parse(cpb(""))).toBeNull();
  expect(Digit1To9.parse(cpb("-1"))).toBeNull();
  expect(Digit1To9.parse(cpb(".123"))).toBeNull();
});

test('Digit valid case', () => {
  expect(new Digit('0')).toStrictEqual(Digit.parse(cpb("0")));
  expect(new Digit('1')).toStrictEqual(Digit.parse(cpb("1")));
  expect(new Digit('2')).toStrictEqual(Digit.parse(cpb("2")));
  expect(new Digit('3')).toStrictEqual(Digit.parse(cpb("3")));
  expect(new Digit('4')).toStrictEqual(Digit.parse(cpb("4")));
  expect(new Digit('5')).toStrictEqual(Digit.parse(cpb("5")));
  expect(new Digit('6')).toStrictEqual(Digit.parse(cpb("6")));
  expect(new Digit('7')).toStrictEqual(Digit.parse(cpb("7")));
  expect(new Digit('8')).toStrictEqual(Digit.parse(cpb("8")));
  expect(new Digit('9')).toStrictEqual(Digit.parse(cpb("9")));
  expect(new Digit('1')).toStrictEqual(Digit.parse(cpb("1 ")));
});

test('Digit invalid case', () => {
  expect(Digit.parse(cpb(""))).toBeNull();
  expect(Digit.parse(cpb("-1"))).toBeNull();
  expect(Digit.parse(cpb("a"))).toBeNull();
  expect(Digit.parse(cpb("A"))).toBeNull();
  expect(Digit.parse(cpb(" "))).toBeNull();
  expect(Digit.parse(cpb(" 1"))).toBeNull();
  expect(Digit.parse(cpb(".22"))).toBeNull();
});

test('DoubleQuoteString valid case', () => {
  let t = new DoubleQuoteString("\"test\"", "test");
  expect("\"test\"").toStrictEqual(t.value);
  expect("test").toStrictEqual(t.content);

  expect(new DoubleQuoteString("\"\\\\\"", "\\")).toStrictEqual(DoubleQuoteString.parse(cpb("\"\\\\\""))); // \
  expect(new DoubleQuoteString("\"\\\"\"", "\"")).toStrictEqual(DoubleQuoteString.parse(cpb("\"\\\"\""))); // \"
  expect(new DoubleQuoteString("\"\\\\\\\"\"", "\\\"")).toStrictEqual(DoubleQuoteString.parse(cpb("\"\\\\\\\"\""))); // \\"
  expect(new DoubleQuoteString("\"\\\\\\\\\"", "\\\\")).toStrictEqual(DoubleQuoteString.parse(cpb("\"\\\\\\\\\""))); // \\
  expect(new DoubleQuoteString("\"test\\\\\"", "test\\")).toStrictEqual(DoubleQuoteString.parse(cpb("\"test\\\\\""))); // test\
  expect(new DoubleQuoteString("\"test\\\"\"", "test\"")).toStrictEqual(DoubleQuoteString.parse(cpb("\"test\\\"\""))); // test\"
  expect(new DoubleQuoteString("\"test\\\\\\\"\"", "test\\\"")).toStrictEqual(DoubleQuoteString.parse(cpb("\"test\\\\\\\"\""))); // test\\"
  expect(new DoubleQuoteString("\"\"", "")).toStrictEqual(DoubleQuoteString.parse(cpb("\"\""))); // empty
});

test('DoubleQuoteString invalid case', () => {
  expect(DoubleQuoteString.parse(cpb("test"))).toBeNull(); // no quote
  expect(DoubleQuoteString.parse(cpb(""))).toBeNull();
  expect(DoubleQuoteString.parse(cpb("234"))).toBeNull();
  expect(DoubleQuoteString.parse(cpb("\""))).toBeNull(); // missing end quote
  expect(DoubleQuoteString.parse(cpb("\"test"))).toBeNull();
  expect(DoubleQuoteString.parse(cpb("\"234"))).toBeNull();
});

test('Frac valid case', () => {
  expect(new Frac(".14")).toStrictEqual(Frac.parse(cpb(".14")));
  expect(new Frac(".14")).toStrictEqual(Frac.parse(cpb(".14.15")));
  expect(new Frac(".14")).toStrictEqual(Frac.parse(cpb(".14 ")));
  expect(new Frac(".14")).toStrictEqual(Frac.parse(cpb(".14abc")));
  expect(new Frac(".14")).toStrictEqual(Frac.parse(cpb(".14\\")));
  expect(new Frac(".14")).toStrictEqual(Frac.parse(cpb(".14\'")));
});

test('Frac invalid case', () => {
  expect(Frac.parse(cpb("."))).toBeNull();
  expect(Frac.parse(cpb("14"))).toBeNull();
  expect(Frac.parse(cpb(""))).toBeNull();
  expect(Frac.parse(cpb(" "))).toBeNull();
  expect(Frac.parse(cpb("abc"))).toBeNull();
  expect(Frac.parse(cpb("-123"))).toBeNull();
  expect(Frac.parse(cpb("3.14"))).toBeNull();
});

test('Int valid case', () => {
  expect(new Int("0")).toStrictEqual(Int.parse(cpb("0")));
  expect(new Int("123")).toStrictEqual(Int.parse(cpb("123")));
  expect(new Int("0")).toStrictEqual(Int.parse(cpb("0 ")));
  expect(new Int("123")).toStrictEqual(Int.parse(cpb("123 ")));
  expect(new Int("0")).toStrictEqual(Int.parse(cpb("0.16")));
  expect(new Int("3")).toStrictEqual(Int.parse(cpb("3.14")));
});

test('Int invalid case', () => {
  expect(Int.parse(cpb("abc"))).toBeNull();
  expect(Int.parse(cpb(""))).toBeNull();
  expect(Int.parse(cpb(" "))).toBeNull();
  expect(Int.parse(cpb(".14"))).toBeNull();
});

test('Minus valid case', () => {
  expect(new Minus()).toStrictEqual(Minus.parse(cpb("-")));
  expect(new Minus()).toStrictEqual(Minus.parse(cpb("- ")));
});

test('Minus invalid case', () => {
  expect(Minus.parse(cpb(""))).toBeNull();
  expect(Minus.parse(cpb("0"))).toBeNull();
  expect(Minus.parse(cpb(" -"))).toBeNull();
  expect(Minus.parse(cpb("a"))).toBeNull();
  expect(Minus.parse(cpb("1"))).toBeNull();
  expect(Minus.parse(cpb("a-"))).toBeNull();
  expect(Minus.parse(cpb("1-"))).toBeNull();
});

test('NegativeInt valid case', () => {
  expect(new NegativeInt("-123")).toStrictEqual(NegativeInt.parse(cpb("-123")));
  expect(new NegativeInt("-123")).toStrictEqual(NegativeInt.parse(cpb("-123abc")));
  expect(new NegativeInt("-123")).toStrictEqual(NegativeInt.parse(cpb("-123 ")));
  expect(new NegativeInt("-123")).toStrictEqual(NegativeInt.parse(cpb("-123 456")));
  expect(new NegativeInt("-3")).toStrictEqual(NegativeInt.parse(cpb("-3.14")));
});

test('NegativeInt invalid case', () => {
  expect(NegativeInt.parse(cpb("abc"))).toBeNull();
  expect(NegativeInt.parse(cpb(""))).toBeNull();
  expect(NegativeInt.parse(cpb("123"))).toBeNull();
  expect(NegativeInt.parse(cpb("0123"))).toBeNull();
  expect(NegativeInt.parse(cpb(".14"))).toBeNull();
});

test('NumberT valid case', () => {
  const number = NumberT.parse(cpb("0"));
  if (number === null) throw new Error("t is null");
  expect(number.value).toStrictEqual("0");
  expect(number.isPositive).toBeTruthy();
  expect(number.isDouble).toBeFalsy();
  expect(NumberT.parse(cpb("14a"))?.toInt()).toStrictEqual(14);
  expect(new NumberT("0", true, false)).toStrictEqual(NumberT.parse(cpb("0")));
  expect(new NumberT("-14", false, false)).toStrictEqual(NumberT.parse(cpb("-14")));
  expect(new NumberT("14", true, false)).toStrictEqual(NumberT.parse(cpb("14")));
  expect(new NumberT("3.14", true, true)).toStrictEqual(NumberT.parse(cpb("3.14 ")));
  expect(new NumberT("-3.14", false, true)).toStrictEqual(NumberT.parse(cpb("-3.14")));
  expect(new NumberT("14", true, false)).toStrictEqual(NumberT.parse(cpb("14\\")));
  expect(new NumberT("14", true, false)).toStrictEqual(NumberT.parse(cpb("14\'")));
  expect(new NumberT("14", true, false)).toStrictEqual(NumberT.parse(cpb("14\"")));
  expect(new NumberT("14", true, false)).toStrictEqual(NumberT.parse(cpb("14 ")));
  expect(new NumberT("-14", false, false)).toStrictEqual(NumberT.parse(cpb("-14\\")));
  expect(new NumberT("-14", false, false)).toStrictEqual(NumberT.parse(cpb("-14\'")));
  expect(new NumberT("-14", false, false)).toStrictEqual(NumberT.parse(cpb("-14\"")));
  expect(new NumberT("-14", false, false)).toStrictEqual(NumberT.parse(cpb("-14 ")));
  expect(new NumberT("3.14", true, true)).toStrictEqual(NumberT.parse(cpb("3.14\\")));
  expect(new NumberT("3.14", true, true)).toStrictEqual(NumberT.parse(cpb("3.14\'")));
  expect(new NumberT("3.14", true, true)).toStrictEqual(NumberT.parse(cpb("3.14\"")));
  expect(new NumberT("3.14", true, true)).toStrictEqual(NumberT.parse(cpb("3.14 ")));
  expect(new NumberT("-3.14", false, true)).toStrictEqual(NumberT.parse(cpb("-3.14\\")));
  expect(new NumberT("-3.14", false, true)).toStrictEqual(NumberT.parse(cpb("-3.14\'")));
  expect(new NumberT("-3.14", false, true)).toStrictEqual(NumberT.parse(cpb("-3.14\"")));
  expect(new NumberT("-3.14", false, true)).toStrictEqual(NumberT.parse(cpb("-3.14 ")));
});

test('NumberT invalid case', () => {
  expect(NumberT.parse(cpb("-"))).toBeNull();
  expect(NumberT.parse(cpb("-0"))).toBeNull();
  expect(NumberT.parse(cpb(""))).toBeNull();
  expect(NumberT.parse(cpb(" "))).toBeNull();
  expect(NumberT.parse(cpb("a"))).toBeNull();
  expect(NumberT.parse(cpb("a14"))).toBeNull();
  expect(NumberT.parse(cpb("a3.14"))).toBeNull();
  expect(NumberT.parse(cpb("a-14"))).toBeNull();
  expect(NumberT.parse(cpb("a-3.14"))).toBeNull();
  expect(NumberT.parse(cpb("a14 "))).toBeNull();
  expect(NumberT.parse(cpb("a3.14 "))).toBeNull();
  expect(NumberT.parse(cpb("a-14 "))).toBeNull();
  expect(NumberT.parse(cpb("a-3.14 "))).toBeNull();
});

test('PositiveInt valid case', () => {
  expect(new PositiveInt("123")).toStrictEqual(PositiveInt.parse(cpb("123")));
  expect(new PositiveInt("123")).toStrictEqual(PositiveInt.parse(cpb("123abc")));
  expect(new PositiveInt("123")).toStrictEqual(PositiveInt.parse(cpb("123 ")));
  expect(new PositiveInt("123")).toStrictEqual(PositiveInt.parse(cpb("123 456")));
  expect(new PositiveInt("3")).toStrictEqual(PositiveInt.parse(cpb("3.14")));
});

test('PositiveInt invalid case', () => {
  expect(PositiveInt.parse(cpb("abc"))).toBeNull();
  expect(PositiveInt.parse(cpb(""))).toBeNull();
  expect(PositiveInt.parse(cpb("-1"))).toBeNull();
  expect(PositiveInt.parse(cpb("0123"))).toBeNull();
  expect(PositiveInt.parse(cpb(".14"))).toBeNull();
});

test('SingleQuoteString valid case', () => {
  expect(new SingleQuoteString("'\\\\'", "\\")).toStrictEqual(SingleQuoteString.parse(cpb("'\\\\'"))); // \
  expect(new SingleQuoteString("'\\''", "'")).toStrictEqual(SingleQuoteString.parse(cpb("'\\''"))); // '
  expect(new SingleQuoteString("'\\\\\\''", "\\'")).toStrictEqual(SingleQuoteString.parse(cpb("'\\\\\\''"))); // \'
  expect(new SingleQuoteString("'\\\\\\\\'", "\\\\")).toStrictEqual(SingleQuoteString.parse(cpb("'\\\\\\\\'"))); // \\
  expect(new SingleQuoteString("'test\\\\'", "test\\")).toStrictEqual(SingleQuoteString.parse(cpb("'test\\\\'"))); // test\
  expect(new SingleQuoteString("'test\\''", "test'")).toStrictEqual(SingleQuoteString.parse(cpb("'test\\''"))); // test'
  expect(new SingleQuoteString("'test\\\\\\''", "test\\'")).toStrictEqual(SingleQuoteString.parse(cpb("'test\\\\\\''"))); // test\'
  expect(new SingleQuoteString("''", "")).toStrictEqual(SingleQuoteString.parse(cpb("''"))); // empty
});

test('SingleQuoteString invalid case', () => {
  expect(SingleQuoteString.parse(cpb("test"))).toBeNull(); // no quote
  expect(SingleQuoteString.parse(cpb(""))).toBeNull();
  expect(SingleQuoteString.parse(cpb("234"))).toBeNull();
  expect(SingleQuoteString.parse(cpb("'"))).toBeNull(); // missing end quote
  expect(SingleQuoteString.parse(cpb("'test"))).toBeNull();
  expect(SingleQuoteString.parse(cpb("'234"))).toBeNull();
});

test('StringT valid case', () => {
  expect(new StringT("test")).toStrictEqual(StringT.parse(cpb("test")));// test
  expect(new StringT("")).toStrictEqual(StringT.parse(cpb(" ")));// empty
  expect(new StringT("test")).toStrictEqual(StringT.parse(cpb("test test")));// test
  expect(new StringT("test")).toStrictEqual(StringT.parse(cpb("'test'"))); // 'test'
  expect(new StringT("test")).toStrictEqual(StringT.parse(cpb("\"test\""))); // "test"
  expect(new StringT("\\")).toStrictEqual(StringT.parse(cpb("'\\\\'"))); // '\\'
  expect(new StringT("'")).toStrictEqual(StringT.parse(cpb("'\\''"))); // '\''
  expect(new StringT("\\")).toStrictEqual(StringT.parse(cpb("\"\\\\\""))); // "\\"
  expect(new StringT("\"")).toStrictEqual(StringT.parse(cpb("'\\\"'"))); // '\"'
  expect(new StringT("\\test")).toStrictEqual(StringT.parse(cpb("'\\\\test'"))); // '\\test'
  expect(new StringT("\\test")).toStrictEqual(StringT.parse(cpb("\"\\\\test\""))); // "\\test"
});

test('StringT invalid case', () => {
  expect(StringT.parse(cpb(""))).toBeNull(); // empty
  expect(StringT.parse(cpb("'"))).toBeNull(); // '
  expect(StringT.parse(cpb("\""))).toBeNull(); // "
  expect(StringT.parse(cpb("'test"))).toBeNull();// 'test
  expect(StringT.parse(cpb("\"test"))).toBeNull();// "test
  expect(StringT.parse(cpb("'test\""))).toBeNull();// 'test"
  expect(StringT.parse(cpb("\"test'"))).toBeNull();// "test'
});

test('Zero valid case', () => {
  expect(new Zero('0')).toStrictEqual(Zero.parse(cpb("0")));
  expect(new Zero('0')).toStrictEqual(Zero.parse(cpb("0 ")));
});

test('Zero invalid case', () => {
  expect(Zero.parse(cpb("1"))).toBeNull();
  expect(Zero.parse(cpb("a"))).toBeNull();
  expect(Zero.parse(cpb(" "))).toBeNull();
  expect(Zero.parse(cpb(""))).toBeNull();
  expect(Zero.parse(cpb("-"))).toBeNull();
  expect(Zero.parse(cpb(" 0"))).toBeNull();
});

function n(n: string, u: UnitOfLength | null = null) {
  return new NumberUOL(n, u);
}
function nmm(n: string) {
  return new NumberUOL(n, UnitOfLength.Millimeter);
}
function ndeg(n: string) {
  return new NumberUOA(n, UnitOfAngle.Degree);
}
function nrad(n: string) {
  return new NumberUOA(n, UnitOfAngle.Radian);
}
function o(o: string) {
  return new Operator(o);
}
function c<U extends Unit>(left: Computable<U>, operator: Operator, right: Computable<U>) {
  return new Computation(left, operator, right);
}

test('NumberWithUnit valid case', () => {
  expect(n('0', null)).toStrictEqual(NumberUOL.parse(cpb("0")));
  expect(n('100', null)).toStrictEqual(NumberUOL.parse(cpb("100")));
  expect(n('3.14', null)).toStrictEqual(NumberUOL.parse(cpb("3.14")));
  expect(n('31.4', null)).toStrictEqual(NumberUOL.parse(cpb("31.4")));
  expect(n('-31.4', null)).toStrictEqual(NumberUOL.parse(cpb("-31.4")));
  expect(n('0', UnitOfLength.Millimeter)).toStrictEqual(NumberUOL.parse(cpb("0mm")));
  expect(n('123', UnitOfLength.Millimeter)).toStrictEqual(NumberUOL.parse(cpb("123mm+")));
  expect(n('123', UnitOfLength.Millimeter)).toStrictEqual(NumberUOL.parse(cpb("123mm(")));
  expect(n('123', UnitOfLength.Millimeter)).toStrictEqual(NumberUOL.parse(cpb("123mm +")));
  expect(n('123', UnitOfLength.Millimeter)).toStrictEqual(NumberUOL.parse(cpb("123 mm +")));
  expect(n('123', UnitOfLength.Millimeter)).toStrictEqual(NumberUOL.parse(cpb("123 mm+")));
  expect(n('-123', UnitOfLength.Millimeter)).toStrictEqual(NumberUOL.parse(cpb("-123mm")));
  expect(n('-123', UnitOfLength.Millimeter)).toStrictEqual(NumberUOL.parse(cpb("-123 mm")));
  expect(n('-123', UnitOfLength.Millimeter)).toStrictEqual(NumberUOL.parse(cpb("-123 mm ")));
  expect(n('-123.45', UnitOfLength.Millimeter)).toStrictEqual(NumberUOL.parse(cpb("-123.45  mm")));
  expect(n('123.45', UnitOfLength.Centimeter)).toStrictEqual(NumberUOL.parse(cpb("123.45cm")));
  expect(n('123.45', UnitOfLength.Meter)).toStrictEqual(NumberUOL.parse(cpb("123.45m")));
  expect(n('123.45', UnitOfLength.Inch)).toStrictEqual(NumberUOL.parse(cpb("123.45in")));
  expect(n('123.45', UnitOfLength.Inch)).toStrictEqual(NumberUOL.parse(cpb("123.45inch")));
  expect(n('123.45', UnitOfLength.Foot)).toStrictEqual(NumberUOL.parse(cpb("123.45ft")));
  expect(n('123.45', UnitOfLength.Foot)).toStrictEqual(NumberUOL.parse(cpb("123.45foot")));
  expect(n('123.45', UnitOfLength.Foot)).toStrictEqual(NumberUOL.parse(cpb("123.45feet")));
  expect(n('123.45', UnitOfLength.Foot)).toStrictEqual(NumberUOL.parse(cpb("123.45   feet")));
});

test('NumberWithUnit valid case with UOA', () => {
  function n(n: string, u: UnitOfAngle | null = null) {
    return new NumberUOA(n, u);
  }

  expect(n('0', null)).toStrictEqual(NumberUOA.parse(cpb("0")));
  expect(n('100', null)).toStrictEqual(NumberUOA.parse(cpb("100")));
  expect(n('3.14', null)).toStrictEqual(NumberUOA.parse(cpb("3.14")));
  expect(n('31.4', null)).toStrictEqual(NumberUOA.parse(cpb("31.4")));
  expect(n('-31.4', null)).toStrictEqual(NumberUOA.parse(cpb("-31.4")));
  expect(n('0', UnitOfAngle.Degree)).toStrictEqual(NumberUOA.parse(cpb("0deg")));
  expect(n('123', UnitOfAngle.Degree)).toStrictEqual(NumberUOA.parse(cpb("123deg")));
  expect(n('123', UnitOfAngle.Degree)).toStrictEqual(NumberUOA.parse(cpb("123deg(")));
  expect(n('123', UnitOfAngle.Degree)).toStrictEqual(NumberUOA.parse(cpb("123deg +")));
  expect(n('123', UnitOfAngle.Degree)).toStrictEqual(NumberUOA.parse(cpb("123 deg +")));
  expect(n('123', UnitOfAngle.Degree)).toStrictEqual(NumberUOA.parse(cpb("123 deg+")));
  expect(n('-123', UnitOfAngle.Degree)).toStrictEqual(NumberUOA.parse(cpb("-123deg")));
  expect(n('-123', UnitOfAngle.Degree)).toStrictEqual(NumberUOA.parse(cpb("-123 deg")));
  expect(n('-123', UnitOfAngle.Degree)).toStrictEqual(NumberUOA.parse(cpb("-123 deg ")));
  expect(n('-123.45', UnitOfAngle.Radian)).toStrictEqual(NumberUOA.parse(cpb("-123.45  rad")));
  expect(n('123.45', UnitOfAngle.Radian)).toStrictEqual(NumberUOA.parse(cpb("123.45rad")));
  expect(n('123.45', UnitOfAngle.Radian)).toStrictEqual(NumberUOA.parse(cpb("123.45rad")));
});

test('NumberWithUnit invalid case', () => {
  expect(NumberUOL.parse(cpb("-0"))).toBeNull();
  expect(NumberUOL.parse(cpb("0mmm"))).toBeNull();
  expect(NumberUOL.parse(cpb("0 mmm"))).toBeNull();
  expect(NumberUOL.parse(cpb("0 mmm"))).toBeNull();
  expect(NumberUOL.parse(cpb("0 456"))).toBeNull();
  expect(NumberUOA.parse(cpb("0mm"))).toBeNull();
  expect(NumberUOL.parse(cpb("0reg"))).toBeNull();
});

test('OpenBracket valid case', () => {
  expect(new OpenBracket()).toStrictEqual(OpenBracket.parse(cpb("(")));
  expect(new OpenBracket()).toStrictEqual(OpenBracket.parse(cpb("( ")));
  expect(new OpenBracket()).toStrictEqual(OpenBracket.parse(cpb("((")));
});

test('OpenBracket invalid case', () => {
  expect(OpenBracket.parse(cpb(")"))).toBeNull();
  expect(OpenBracket.parse(cpb(") "))).toBeNull();
});

test('CloseBracket valid case', () => {
  expect(new OpenBracket()).not.toStrictEqual(CloseBracket.parse(cpb(")")));
  expect(new CloseBracket()).toStrictEqual(CloseBracket.parse(cpb(")")));
  expect(new CloseBracket()).toStrictEqual(CloseBracket.parse(cpb(") ")));
});

test('CloseBracket invalid case', () => {
  expect(CloseBracket.parse(cpb("("))).toBeNull();
  expect(CloseBracket.parse(cpb("( "))).toBeNull();
});

test('Operator valid case', () => {
  expect(new Operator('+')).toStrictEqual(Operator.parse(cpb("+")));
  expect(new Operator('-')).toStrictEqual(Operator.parse(cpb("-")));
  expect(new Operator('*')).toStrictEqual(Operator.parse(cpb("*")));
  expect(new Operator('/')).toStrictEqual(Operator.parse(cpb("/")));
  expect(new Operator('+')).toStrictEqual(Operator.parse(cpb("+1")));
  expect(new Operator('-')).toStrictEqual(Operator.parse(cpb("-1")));
  expect(new Operator('-')).toStrictEqual(Operator.parse(cpb("- 1")));
});

test('Operator invalid case', () => {
  expect(Operator.parse(cpb("1+"))).toBeNull();
  expect(Operator.parse(cpb("("))).toBeNull();
});

const ob = new OpenBracket();
const cb = new CloseBracket();

test('Expression valid case', () => {
  expect(new Expression([n('123')])).toStrictEqual(Expression.parseWith(cpb("123"), NumberUOL.parse));
  expect(new Expression([n('123')])).toStrictEqual(Expression.parseWith(cpb("123)"), NumberUOL.parse));
  expect(new Expression([n('123')])).toStrictEqual(Expression.parseWith(cpb("123 )"), NumberUOL.parse));
  expect(new Expression([n('123')])).toStrictEqual(Expression.parseWith(cpb("123 (456)"), NumberUOL.parse));
  expect(new Expression([n('123')])).toStrictEqual(Expression.parseWith(cpb(" 123"), NumberUOL.parse));
  expect(new Expression([n('-123')])).toStrictEqual(Expression.parseWith(cpb("-123"), NumberUOL.parse));
  expect(new Expression([n('123.45')])).toStrictEqual(Expression.parseWith(cpb("123.45"), NumberUOL.parse));
  expect(new Expression([nmm('123.45')])).toStrictEqual(Expression.parseWith(cpb("123.45mm "), NumberUOL.parse));
  expect(new Expression([nmm('123.45')])).toStrictEqual(Expression.parseWith(cpb("123.45mm "), NumberUOL.parse));
  expect(new Expression([n('123'), o('+'), n('456')])).toStrictEqual(Expression.parseWith(cpb("123+456"), NumberUOL.parse));
  expect(new Expression([n('123'), o('+'), n('456')])).toStrictEqual(Expression.parseWith(cpb("123 +456"), NumberUOL.parse));
  expect(new Expression([n('123'), o('+'), n('456')])).toStrictEqual(Expression.parseWith(cpb("123+ 456"), NumberUOL.parse));
  expect(new Expression([n('123'), o('+'), n('456')])).toStrictEqual(Expression.parseWith(cpb("123 + 456"), NumberUOL.parse));
  expect(new Expression([n('123'), o('-'), n('456')])).toStrictEqual(Expression.parseWith(cpb("123-456"), NumberUOL.parse));
  expect(new Expression([n('123'), o('-'), n('456')])).toStrictEqual(Expression.parseWith(cpb("123 -456"), NumberUOL.parse));
  expect(new Expression([n('123'), o('-'), n('456')])).toStrictEqual(Expression.parseWith(cpb("123- 456"), NumberUOL.parse));
  expect(new Expression([n('123'), o('-'), n('456')])).toStrictEqual(Expression.parseWith(cpb("123 - 456"), NumberUOL.parse));
  expect(new Expression([n('123'), o('+'), n('-456')])).toStrictEqual(Expression.parseWith(cpb("123+-456"), NumberUOL.parse));
  expect(new Expression([n('123'), o('+'), n('-456')])).toStrictEqual(Expression.parseWith(cpb("123 +-456"), NumberUOL.parse));
  expect(new Expression([n('123'), o('+'), n('-456')])).toStrictEqual(Expression.parseWith(cpb("123+ -456"), NumberUOL.parse));
  expect(new Expression([n('123'), o('+'), n('-456')])).toStrictEqual(Expression.parseWith(cpb("123 + -456"), NumberUOL.parse));
  expect(new Expression([nmm('123'), o('+'), n('-456')])).toStrictEqual(Expression.parseWith(cpb("123mm + -456"), NumberUOL.parse));
  expect(new Expression([nmm('123'), o('+'), nmm('-456')])).toStrictEqual(Expression.parseWith(cpb("123mm + -456mm"), NumberUOL.parse));
  expect(new Expression([n('123'), o('+'), nmm('-456')])).toStrictEqual(Expression.parseWith(cpb("123 + -456mm"), NumberUOL.parse));
  expect(new Expression([n('123'), o('+'), n('456'), o('+'), n('789')])).toStrictEqual(Expression.parseWith(cpb("123+456+789"), NumberUOL.parse));
  expect(new Expression([n('123'), o('+'), n('456'), o('+'), n('789')])).toStrictEqual(Expression.parseWith(cpb("123 +456 + 789"), NumberUOL.parse));
  expect(new Expression([ob, n('123'), cb])).toStrictEqual(Expression.parseWith(cpb("(123)"), NumberUOL.parse));
  expect(new Expression([ob, n('123'), cb])).toStrictEqual(Expression.parseWith(cpb("(123)(456)"), NumberUOL.parse));
  expect(new Expression([ob, ob, n('123'), cb, cb])).toStrictEqual(Expression.parseWith(cpb("((123))"), NumberUOL.parse));
  expect(new Expression([ob, ob, n('123'), cb, cb])).toStrictEqual(Expression.parseWith(cpb("( (123 ))"), NumberUOL.parse));
  expect(new Expression([ob, ob, n('123'), cb, cb])).toStrictEqual(Expression.parseWith(cpb("(( 123) )"), NumberUOL.parse));
  expect(new Expression([ob, ob, n('123'), cb, cb])).toStrictEqual(Expression.parseWith(cpb(" ( ( 123) ) "), NumberUOL.parse));
  expect(new Expression([ob, ob, n('123'), cb, cb])).toStrictEqual(Expression.parseWith(cpb(" ( ( 123 ) ) "), NumberUOL.parse));
  expect(new Expression([ob, ob, n('123'), o('+'), n('456'), cb, cb])).toStrictEqual(Expression.parseWith(cpb(" ( ( 123+456 ) ) "), NumberUOL.parse));
  expect(new Expression([ob, ob, n('123'), o('+'), n('456'), cb, cb])).toStrictEqual(Expression.parseWith(cpb(" ( ( 123 + 456 ) ) "), NumberUOL.parse));
  expect(new Expression([ob, ob, n('123'), o('+'), ob, n('456'), o('-'), n('3'), cb, cb, cb])).toStrictEqual(Expression.parseWith(cpb(" ( ( 123 + (456-3) ) ) "), NumberUOL.parse));
  expect(new Expression([
    ob, n('123'), o('+'), n('456'), cb,
    o('*'),
    n('789')
  ])).toStrictEqual(Expression.parseWith(cpb("(123+456)*789"), NumberUOL.parse));
  expect(new Expression([
    n('123'),
    o('*'),
    ob, n('789'), o('/'), n('3.14'), cb
  ])).toStrictEqual(Expression.parseWith(cpb("123*(789/3.14)"), NumberUOL.parse));
  expect(new Expression([
    ob, n('123'), cb,
    o('*'),
    ob, n('789'), o('/'), n('3.14'), cb
  ])).toStrictEqual(Expression.parseWith(cpb("(123)*(789/3.14)"), NumberUOL.parse));
  expect(new Expression([
    ob, n('123'), o('+'), n('456'), cb,
    o('*'),
    ob, n('789'), o('/'), n('3.14'), cb
  ])).toStrictEqual(Expression.parseWith(cpb("(123+456)*(789/3.14)"), NumberUOL.parse));

});

test('Expression invalid case', () => {
  expect(Expression.parseWith(cpb(""), NumberUOL.parse)).toBeNull();
  expect(Expression.parseWith(cpb("123+"), NumberUOL.parse)).toBeNull();
  expect(Expression.parseWith(cpb("123 +"), NumberUOL.parse)).toBeNull();
  expect(Expression.parseWith(cpb("123 + "), NumberUOL.parse)).toBeNull();
  expect(Expression.parseWith(cpb("123 + -0"), NumberUOL.parse)).toBeNull();
  expect(Expression.parseWith(cpb("- 123"), NumberUOL.parse)).toBeNull();
  expect(Expression.parseWith(cpb("123 + - 1"), NumberUOL.parse)).toBeNull();
  expect(Expression.parseWith(cpb("(123"), NumberUOL.parse)).toBeNull();
  expect(Expression.parseWith(cpb("123 456"), NumberUOL.parse)).toBeNull(); // Due to NumberWithUnit token
});

test('Expression invalid case with UOA', () => {
  expect(Expression.parseWith(cpb(""), NumberUOA.parse)).toBeNull();
  expect(Expression.parseWith(cpb("123+"), NumberUOA.parse)).toBeNull();
  expect(Expression.parseWith(cpb("123 +"), NumberUOA.parse)).toBeNull();
  expect(Expression.parseWith(cpb("123 + "), NumberUOA.parse)).toBeNull();
  expect(Expression.parseWith(cpb("123 + -0"), NumberUOA.parse)).toBeNull();
  expect(Expression.parseWith(cpb("- 123"), NumberUOA.parse)).toBeNull();
  expect(Expression.parseWith(cpb("123 + - 1"), NumberUOA.parse)).toBeNull();
  expect(Expression.parseWith(cpb("(123"), NumberUOA.parse)).toBeNull();
  expect(Expression.parseWith(cpb("123 456"), NumberUOA.parse)).toBeNull(); // Due to NumberWithUnit token
});

test('Computation valid case', () => {
  expect(c(n('123'), o('+'), n('0'))).toStrictEqual(Computation.parseWith(cpb("123"), NumberUOL.parse));
  expect(c(n('123'), o('+'), n('0'))).toStrictEqual(Computation.parseWith(cpb("(123)"), NumberUOL.parse));
  expect(c(n('123'), o('+'), n('0'))).toStrictEqual(Computation.parseWith(cpb(" (  ( ( 123)  ) )  "), NumberUOL.parse));
  expect(c(n('123'), o('+'), n('0'))).toStrictEqual(Computation.parseWith(cpb("(((123)))"), NumberUOL.parse));

  expect(c(n('123'), o('+'), n('456'))).toStrictEqual(Computation.parseWith(cpb("123+456"), NumberUOL.parse));
  expect(c(
    c(n('123'), o('+'), n('456')),
    o('-'),
    n('789')
  )).toStrictEqual(Computation.parseWith(cpb("123+456-789"), NumberUOL.parse));
  expect(c(
    n('123'),
    o('+'),
    c(n('456'), o('*'), n('789'))
  )).toStrictEqual(Computation.parseWith(cpb("123+456*789"), NumberUOL.parse));
  expect(c(
    c(n('123'), o('/'), n('456')),
    o('-'),
    n('789')
  )).toStrictEqual(Computation.parseWith(cpb("123/456-789"), NumberUOL.parse));
  expect(c(
    c(
      c(n('1'), o('+'), n('2')),
      o('*'),
      n('3')
    ),
    o('-'),
    n('4')
  )).toStrictEqual(Computation.parseWith(cpb("(1+2)*3-4"), NumberUOL.parse));
  expect(c(
    c(n('1'), o('+'), n('2')),
    o('/'),
    c(n('3'), o('-'), n('4'))
  )).toStrictEqual(Computation.parseWith(cpb("(1+2)/(3-4)"), NumberUOL.parse));
  expect(c(
    n('1'),
    o('+'),
    c(
      n('2'),
      o('/'),
      c(n('3'), o('-'), n('4'))
    ),
  )).toStrictEqual(Computation.parseWith(cpb("1+2/(3-4)"), NumberUOL.parse));
  expect(c(
    c(
      n('1'),
      o('+'),
      c(n('2'), o('/'), n('3'))
    ),
    o('-'),
    n('4'),
  )).toStrictEqual(Computation.parseWith(cpb("1+2/3-4"), NumberUOL.parse));
  expect(c(
    n('1'),
    o('+'),
    c(
      n('2'),
      o('/'),
      c(
        n('3'),
        o('-'),
        c(n('4'), o('+'), n('5'))
      )
    ),
  )).toStrictEqual(Computation.parseWith(cpb("1+2/(3-(4+5))"), NumberUOL.parse));
  expect(c(
    n('1'),
    o('+'),
    c(
      n('2'),
      o('/'),
      c(
        c(n('3'), o('-'), n('4')),
        o('+'),
        n('5')
      )
    ),
  )).toStrictEqual(Computation.parseWith(cpb("1+2/((3-4)+5)"), NumberUOL.parse));

  expect(Computation.parseWith(cpb("1"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBe(1);
  expect(Computation.parseWith(cpb("2"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBe(2);
  expect(Computation.parseWith(cpb("(2)"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBe(2);
  expect(Computation.parseWith(cpb("3.14"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBeCloseTo(3.14);
  expect(Computation.parseWith(cpb("1+1"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBe(2);
  expect(Computation.parseWith(cpb("1cm+2cm"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBe(3);
  expect(Computation.parseWith(cpb("1cm+3.14cm"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBeCloseTo(4.14);
  expect(Computation.parseWith(cpb("1cm+31.4mm"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBeCloseTo(4.14);
  expect(Computation.parseWith(cpb("10mm+31.4mm"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBeCloseTo(4.14);
  expect(Computation.parseWith(cpb("10mm+31.4mm"), NumberUOL.parse)?.compute(UnitOfLength.Meter)).toBeCloseTo(4.14 / 100);
  expect(Computation.parseWith(cpb("1m/100+31.4mm"), NumberUOL.parse)?.compute(UnitOfLength.Meter)).toBeCloseTo(4.14 / 100);
  expect(Computation.parseWith(cpb("1m/100+31.4mm"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBeCloseTo(4.14);

  expect(Computation.parseWith(cpb("(1+2)/(3-4)"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBeCloseTo(-3);
  expect(Computation.parseWith(cpb("(1+2)/3-4"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBeCloseTo(-3);
  expect(Computation.parseWith(cpb("1+2/(3-4)"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBeCloseTo(-1);
  expect(Computation.parseWith(cpb("1+2/3-4"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBeCloseTo(-2.33333);
  expect(Computation.parseWith(cpb("1+2/(3-(4+5))"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBeCloseTo(0.66666);
  expect(Computation.parseWith(cpb("1+2/((3-4)+5)"), NumberUOL.parse)?.compute(UnitOfLength.Centimeter)).toBeCloseTo(1.5);
});
