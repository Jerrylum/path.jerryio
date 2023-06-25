import { UnitOfLength } from "../types/Unit";
import { Zero, CodePointBuffer, isDelimiter, isSafeDelimiter, BooleanT, DecimalPoint, Digit1To9, Digit, DoubleQuoteString, Frac, Int, Minus, NegativeInt, NumberT, PositiveInt, SingleQuoteString, StringT, NumberWithUnit, Operator, CloseBracket, OpenBracket, Expression } from "./Tokens";

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

  expect(new BooleanT("True", true)).toEqual(BooleanT.parse(cpb("True")));
  expect(new BooleanT("true", true)).toEqual(BooleanT.parse(cpb("true")));
  expect(new BooleanT("False", false)).toEqual(BooleanT.parse(cpb("False")));
  expect(new BooleanT("false", false)).toEqual(BooleanT.parse(cpb("false")));
  expect(new BooleanT("True", true)).toEqual(BooleanT.parse(cpb("True ")));
  expect(new BooleanT("TrUe", true)).toEqual(BooleanT.parse(cpb("TrUe ")));
  expect(new BooleanT("fAlse", false)).toEqual(BooleanT.parse(cpb("fAlse")));
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
  expect(new DecimalPoint('.')).toEqual(DecimalPoint.parse(cpb(".")));
  expect(new DecimalPoint('.')).toEqual(DecimalPoint.parse(cpb(". ")));
  expect(new DecimalPoint('.')).toEqual(DecimalPoint.parse(cpb(".a")));
  expect(new DecimalPoint('.')).toEqual(DecimalPoint.parse(cpb(".123")));
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
  expect(new Digit1To9('1')).toEqual(Digit1To9.parse(cpb("1")));
  expect(new Digit1To9('2')).toEqual(Digit1To9.parse(cpb("2")));
  expect(new Digit1To9('3')).toEqual(Digit1To9.parse(cpb("3")));
  expect(new Digit1To9('4')).toEqual(Digit1To9.parse(cpb("4")));
  expect(new Digit1To9('5')).toEqual(Digit1To9.parse(cpb("5")));
  expect(new Digit1To9('6')).toEqual(Digit1To9.parse(cpb("6")));
  expect(new Digit1To9('7')).toEqual(Digit1To9.parse(cpb("7")));
  expect(new Digit1To9('8')).toEqual(Digit1To9.parse(cpb("8")));
  expect(new Digit1To9('9')).toEqual(Digit1To9.parse(cpb("9")));
  expect(new Digit1To9('1')).toEqual(Digit1To9.parse(cpb("10")));
  expect(new Digit1To9('1')).toEqual(Digit1To9.parse(cpb("1 ")));
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
  expect(new Digit('0')).toEqual(Digit.parse(cpb("0")));
  expect(new Digit('1')).toEqual(Digit.parse(cpb("1")));
  expect(new Digit('2')).toEqual(Digit.parse(cpb("2")));
  expect(new Digit('3')).toEqual(Digit.parse(cpb("3")));
  expect(new Digit('4')).toEqual(Digit.parse(cpb("4")));
  expect(new Digit('5')).toEqual(Digit.parse(cpb("5")));
  expect(new Digit('6')).toEqual(Digit.parse(cpb("6")));
  expect(new Digit('7')).toEqual(Digit.parse(cpb("7")));
  expect(new Digit('8')).toEqual(Digit.parse(cpb("8")));
  expect(new Digit('9')).toEqual(Digit.parse(cpb("9")));
  expect(new Digit('1')).toEqual(Digit.parse(cpb("1 ")));
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
  expect("\"test\"").toEqual(t.value);
  expect("test").toEqual(t.content);

  expect(new DoubleQuoteString("\"\\\\\"", "\\")).toEqual(DoubleQuoteString.parse(cpb("\"\\\\\""))); // \
  expect(new DoubleQuoteString("\"\\\"\"", "\"")).toEqual(DoubleQuoteString.parse(cpb("\"\\\"\""))); // \"
  expect(new DoubleQuoteString("\"\\\\\\\"\"", "\\\"")).toEqual(DoubleQuoteString.parse(cpb("\"\\\\\\\"\""))); // \\"
  expect(new DoubleQuoteString("\"\\\\\\\\\"", "\\\\")).toEqual(DoubleQuoteString.parse(cpb("\"\\\\\\\\\""))); // \\
  expect(new DoubleQuoteString("\"test\\\\\"", "test\\")).toEqual(DoubleQuoteString.parse(cpb("\"test\\\\\""))); // test\
  expect(new DoubleQuoteString("\"test\\\"\"", "test\"")).toEqual(DoubleQuoteString.parse(cpb("\"test\\\"\""))); // test\"
  expect(new DoubleQuoteString("\"test\\\\\\\"\"", "test\\\"")).toEqual(DoubleQuoteString.parse(cpb("\"test\\\\\\\"\""))); // test\\"
  expect(new DoubleQuoteString("\"\"", "")).toEqual(DoubleQuoteString.parse(cpb("\"\""))); // empty
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
  expect(new Frac(".14")).toEqual(Frac.parse(cpb(".14")));
  expect(new Frac(".14")).toEqual(Frac.parse(cpb(".14.15")));
  expect(new Frac(".14")).toEqual(Frac.parse(cpb(".14 ")));
  expect(new Frac(".14")).toEqual(Frac.parse(cpb(".14abc")));
  expect(new Frac(".14")).toEqual(Frac.parse(cpb(".14\\")));
  expect(new Frac(".14")).toEqual(Frac.parse(cpb(".14\'")));
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
  expect(new Int("0")).toEqual(Int.parse(cpb("0")));
  expect(new Int("123")).toEqual(Int.parse(cpb("123")));
  expect(new Int("0")).toEqual(Int.parse(cpb("0 ")));
  expect(new Int("123")).toEqual(Int.parse(cpb("123 ")));
  expect(new Int("0")).toEqual(Int.parse(cpb("0.16")));
  expect(new Int("3")).toEqual(Int.parse(cpb("3.14")));
});

test('Int invalid case', () => {
  expect(Int.parse(cpb("abc"))).toBeNull();
  expect(Int.parse(cpb(""))).toBeNull();
  expect(Int.parse(cpb(" "))).toBeNull();
  expect(Int.parse(cpb(".14"))).toBeNull();
});

test('Minus valid case', () => {
  expect(new Minus("-")).toEqual(Minus.parse(cpb("-")));
  expect(new Minus("-")).toEqual(Minus.parse(cpb("- ")));
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
  expect(new NegativeInt("-123")).toEqual(NegativeInt.parse(cpb("-123")));
  expect(new NegativeInt("-123")).toEqual(NegativeInt.parse(cpb("-123abc")));
  expect(new NegativeInt("-123")).toEqual(NegativeInt.parse(cpb("-123 ")));
  expect(new NegativeInt("-123")).toEqual(NegativeInt.parse(cpb("-123 456")));
  expect(new NegativeInt("-3")).toEqual(NegativeInt.parse(cpb("-3.14")));
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
  expect(number.value).toEqual("0");
  expect(number.isPositive).toBeTruthy();
  expect(number.isDouble).toBeFalsy();
  expect(NumberT.parse(cpb("14a"))?.toInt()).toEqual(14);
  expect(new NumberT("0", true, false)).toEqual(NumberT.parse(cpb("0")));
  expect(new NumberT("-14", false, false)).toEqual(NumberT.parse(cpb("-14")));
  expect(new NumberT("14", true, false)).toEqual(NumberT.parse(cpb("14")));
  expect(new NumberT("3.14", true, true)).toEqual(NumberT.parse(cpb("3.14 ")));
  expect(new NumberT("-3.14", false, true)).toEqual(NumberT.parse(cpb("-3.14")));
  expect(new NumberT("14", true, false)).toEqual(NumberT.parse(cpb("14\\")));
  expect(new NumberT("14", true, false)).toEqual(NumberT.parse(cpb("14\'")));
  expect(new NumberT("14", true, false)).toEqual(NumberT.parse(cpb("14\"")));
  expect(new NumberT("14", true, false)).toEqual(NumberT.parse(cpb("14 ")));
  expect(new NumberT("-14", false, false)).toEqual(NumberT.parse(cpb("-14\\")));
  expect(new NumberT("-14", false, false)).toEqual(NumberT.parse(cpb("-14\'")));
  expect(new NumberT("-14", false, false)).toEqual(NumberT.parse(cpb("-14\"")));
  expect(new NumberT("-14", false, false)).toEqual(NumberT.parse(cpb("-14 ")));
  expect(new NumberT("3.14", true, true)).toEqual(NumberT.parse(cpb("3.14\\")));
  expect(new NumberT("3.14", true, true)).toEqual(NumberT.parse(cpb("3.14\'")));
  expect(new NumberT("3.14", true, true)).toEqual(NumberT.parse(cpb("3.14\"")));
  expect(new NumberT("3.14", true, true)).toEqual(NumberT.parse(cpb("3.14 ")));
  expect(new NumberT("-3.14", false, true)).toEqual(NumberT.parse(cpb("-3.14\\")));
  expect(new NumberT("-3.14", false, true)).toEqual(NumberT.parse(cpb("-3.14\'")));
  expect(new NumberT("-3.14", false, true)).toEqual(NumberT.parse(cpb("-3.14\"")));
  expect(new NumberT("-3.14", false, true)).toEqual(NumberT.parse(cpb("-3.14 ")));
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
  expect(new PositiveInt("123")).toEqual(PositiveInt.parse(cpb("123")));
  expect(new PositiveInt("123")).toEqual(PositiveInt.parse(cpb("123abc")));
  expect(new PositiveInt("123")).toEqual(PositiveInt.parse(cpb("123 ")));
  expect(new PositiveInt("123")).toEqual(PositiveInt.parse(cpb("123 456")));
  expect(new PositiveInt("3")).toEqual(PositiveInt.parse(cpb("3.14")));
});

test('PositiveInt invalid case', () => {
  expect(PositiveInt.parse(cpb("abc"))).toBeNull();
  expect(PositiveInt.parse(cpb(""))).toBeNull();
  expect(PositiveInt.parse(cpb("-1"))).toBeNull();
  expect(PositiveInt.parse(cpb("0123"))).toBeNull();
  expect(PositiveInt.parse(cpb(".14"))).toBeNull();
});

test('SingleQuoteString valid case', () => {
  expect(new SingleQuoteString("'\\\\'", "\\")).toEqual(SingleQuoteString.parse(cpb("'\\\\'"))); // \
  expect(new SingleQuoteString("'\\''", "'")).toEqual(SingleQuoteString.parse(cpb("'\\''"))); // '
  expect(new SingleQuoteString("'\\\\\\''", "\\'")).toEqual(SingleQuoteString.parse(cpb("'\\\\\\''"))); // \'
  expect(new SingleQuoteString("'\\\\\\\\'", "\\\\")).toEqual(SingleQuoteString.parse(cpb("'\\\\\\\\'"))); // \\
  expect(new SingleQuoteString("'test\\\\'", "test\\")).toEqual(SingleQuoteString.parse(cpb("'test\\\\'"))); // test\
  expect(new SingleQuoteString("'test\\''", "test'")).toEqual(SingleQuoteString.parse(cpb("'test\\''"))); // test'
  expect(new SingleQuoteString("'test\\\\\\''", "test\\'")).toEqual(SingleQuoteString.parse(cpb("'test\\\\\\''"))); // test\'
  expect(new SingleQuoteString("''", "")).toEqual(SingleQuoteString.parse(cpb("''"))); // empty
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
  expect(new StringT("test")).toEqual(StringT.parse(cpb("test")));// test
  expect(new StringT("")).toEqual(StringT.parse(cpb(" ")));// empty
  expect(new StringT("test")).toEqual(StringT.parse(cpb("test test")));// test
  expect(new StringT("test")).toEqual(StringT.parse(cpb("'test'"))); // 'test'
  expect(new StringT("test")).toEqual(StringT.parse(cpb("\"test\""))); // "test"
  expect(new StringT("\\")).toEqual(StringT.parse(cpb("'\\\\'"))); // '\\'
  expect(new StringT("'")).toEqual(StringT.parse(cpb("'\\''"))); // '\''
  expect(new StringT("\\")).toEqual(StringT.parse(cpb("\"\\\\\""))); // "\\"
  expect(new StringT("\"")).toEqual(StringT.parse(cpb("'\\\"'"))); // '\"'
  expect(new StringT("\\test")).toEqual(StringT.parse(cpb("'\\\\test'"))); // '\\test'
  expect(new StringT("\\test")).toEqual(StringT.parse(cpb("\"\\\\test\""))); // "\\test"
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
  expect(new Zero('0')).toEqual(Zero.parse(cpb("0")));
  expect(new Zero('0')).toEqual(Zero.parse(cpb("0 ")));
});

test('Zero invalid case', () => {
  expect(Zero.parse(cpb("1"))).toBeNull();
  expect(Zero.parse(cpb("a"))).toBeNull();
  expect(Zero.parse(cpb(" "))).toBeNull();
  expect(Zero.parse(cpb(""))).toBeNull();
  expect(Zero.parse(cpb("-"))).toBeNull();
  expect(Zero.parse(cpb(" 0"))).toBeNull();
});

test('NumberWithUnit valid case', () => {
  expect(new NumberWithUnit('0', null)).toEqual(NumberWithUnit.parse(cpb("0")));
  expect(new NumberWithUnit('100', null)).toEqual(NumberWithUnit.parse(cpb("100")));
  expect(new NumberWithUnit('3.14', null)).toEqual(NumberWithUnit.parse(cpb("3.14")));
  expect(new NumberWithUnit('31.4', null)).toEqual(NumberWithUnit.parse(cpb("31.4")));
  expect(new NumberWithUnit('-31.4', null)).toEqual(NumberWithUnit.parse(cpb("-31.4")));
  expect(new NumberWithUnit('0', UnitOfLength.Millimeter)).toEqual(NumberWithUnit.parse(cpb("0mm")));
  expect(new NumberWithUnit('123', UnitOfLength.Millimeter)).toEqual(NumberWithUnit.parse(cpb("123mm+")));
  expect(new NumberWithUnit('123', UnitOfLength.Millimeter)).toEqual(NumberWithUnit.parse(cpb("123mm(")));
  expect(new NumberWithUnit('123', UnitOfLength.Millimeter)).toEqual(NumberWithUnit.parse(cpb("123mm +")));
  expect(new NumberWithUnit('123', UnitOfLength.Millimeter)).toEqual(NumberWithUnit.parse(cpb("123 mm +")));
  expect(new NumberWithUnit('123', UnitOfLength.Millimeter)).toEqual(NumberWithUnit.parse(cpb("123 mm+")));
  expect(new NumberWithUnit('-123', UnitOfLength.Millimeter)).toEqual(NumberWithUnit.parse(cpb("-123mm")));
  expect(new NumberWithUnit('-123', UnitOfLength.Millimeter)).toEqual(NumberWithUnit.parse(cpb("-123 mm")));
  expect(new NumberWithUnit('-123', UnitOfLength.Millimeter)).toEqual(NumberWithUnit.parse(cpb("-123 mm ")));
  expect(new NumberWithUnit('-123.45', UnitOfLength.Millimeter)).toEqual(NumberWithUnit.parse(cpb("-123.45  mm")));
  expect(new NumberWithUnit('123.45', UnitOfLength.Centimeter)).toEqual(NumberWithUnit.parse(cpb("123.45cm")));
  expect(new NumberWithUnit('123.45', UnitOfLength.Meter)).toEqual(NumberWithUnit.parse(cpb("123.45m")));
  expect(new NumberWithUnit('123.45', UnitOfLength.Inch)).toEqual(NumberWithUnit.parse(cpb("123.45in")));
  expect(new NumberWithUnit('123.45', UnitOfLength.Inch)).toEqual(NumberWithUnit.parse(cpb("123.45inch")));
  expect(new NumberWithUnit('123.45', UnitOfLength.Foot)).toEqual(NumberWithUnit.parse(cpb("123.45ft")));
  expect(new NumberWithUnit('123.45', UnitOfLength.Foot)).toEqual(NumberWithUnit.parse(cpb("123.45foot")));
  expect(new NumberWithUnit('123.45', UnitOfLength.Foot)).toEqual(NumberWithUnit.parse(cpb("123.45feet")));
  expect(new NumberWithUnit('123.45', UnitOfLength.Foot)).toEqual(NumberWithUnit.parse(cpb("123.45   feet")));
});

test('NumberWithUnit invalid case', () => {
  expect(NumberWithUnit.parse(cpb("-0"))).toBeNull();
  expect(NumberWithUnit.parse(cpb("0mmm"))).toBeNull();
  expect(NumberWithUnit.parse(cpb("0 mmm"))).toBeNull();
  expect(NumberWithUnit.parse(cpb("0 mmm"))).toBeNull();
  expect(NumberWithUnit.parse(cpb("0 456"))).toBeNull();
});

test('OpenBracket valid case', () => {
  expect(new OpenBracket('(')).toEqual(OpenBracket.parse(cpb("(")));
  expect(new OpenBracket('(')).toEqual(OpenBracket.parse(cpb("( ")));
  expect(new OpenBracket('(')).toEqual(OpenBracket.parse(cpb("((")));
});

test('OpenBracket invalid case', () => {
  expect(OpenBracket.parse(cpb(")"))).toBeNull();
  expect(OpenBracket.parse(cpb(") "))).toBeNull();
});

test('CloseBracket valid case', () => {
  expect(new CloseBracket(')')).toEqual(CloseBracket.parse(cpb(")")));
  expect(new CloseBracket(')')).toEqual(CloseBracket.parse(cpb(") ")));
});

test('CloseBracket invalid case', () => {
  expect(CloseBracket.parse(cpb("("))).toBeNull();
  expect(CloseBracket.parse(cpb("( "))).toBeNull();
});

test('Operator valid case', () => {
  expect(new Operator('+')).toEqual(Operator.parse(cpb("+")));
  expect(new Operator('-')).toEqual(Operator.parse(cpb("-")));
  expect(new Operator('*')).toEqual(Operator.parse(cpb("*")));
  expect(new Operator('/')).toEqual(Operator.parse(cpb("/")));
  expect(new Operator('+')).toEqual(Operator.parse(cpb("+1")));
  expect(new Operator('-')).toEqual(Operator.parse(cpb("-1")));
  expect(new Operator('-')).toEqual(Operator.parse(cpb("- 1")));
});

test('Operator invalid case', () => {
  expect(Operator.parse(cpb("1+"))).toBeNull();
  expect(Operator.parse(cpb("("))).toBeNull();
});

function n(n: string, u: UnitOfLength | null = null) {
  return new NumberWithUnit(n, u);
}
function nmm(n: string) {
  return new NumberWithUnit(n, UnitOfLength.Millimeter);
}
function o(o: string) {
  return new Operator(o);
}

const ob = new OpenBracket('(');
const cb = new CloseBracket(')');

test('Expression valid case', () => {
  expect(new Expression([n('123')])).toEqual(Expression.parse(cpb("123")));
  expect(new Expression([n('123')])).toEqual(Expression.parse(cpb("123)")));
  expect(new Expression([n('123')])).toEqual(Expression.parse(cpb("123 )")));
  expect(new Expression([n('123')])).toEqual(Expression.parse(cpb("123 (456)")));
  expect(new Expression([n('123')])).toEqual(Expression.parse(cpb(" 123")));
  expect(new Expression([n('-123')])).toEqual(Expression.parse(cpb("-123")));
  expect(new Expression([n('123.45')])).toEqual(Expression.parse(cpb("123.45")));
  expect(new Expression([nmm('123.45')])).toEqual(Expression.parse(cpb("123.45mm ")));
  expect(new Expression([nmm('123.45')])).toEqual(Expression.parse(cpb("123.45mm ")));
  expect(new Expression([n('123'), o('+'), n('456')])).toEqual(Expression.parse(cpb("123+456")));
  expect(new Expression([n('123'), o('+'), n('456')])).toEqual(Expression.parse(cpb("123 +456")));
  expect(new Expression([n('123'), o('+'), n('456')])).toEqual(Expression.parse(cpb("123+ 456")));
  expect(new Expression([n('123'), o('+'), n('456')])).toEqual(Expression.parse(cpb("123 + 456")));
  expect(new Expression([n('123'), o('-'), n('456')])).toEqual(Expression.parse(cpb("123-456")));
  expect(new Expression([n('123'), o('-'), n('456')])).toEqual(Expression.parse(cpb("123 -456")));
  expect(new Expression([n('123'), o('-'), n('456')])).toEqual(Expression.parse(cpb("123- 456")));
  expect(new Expression([n('123'), o('-'), n('456')])).toEqual(Expression.parse(cpb("123 - 456")));
  expect(new Expression([n('123'), o('+'), n('-456')])).toEqual(Expression.parse(cpb("123+-456")));
  expect(new Expression([n('123'), o('+'), n('-456')])).toEqual(Expression.parse(cpb("123 +-456")));
  expect(new Expression([n('123'), o('+'), n('-456')])).toEqual(Expression.parse(cpb("123+ -456")));
  expect(new Expression([n('123'), o('+'), n('-456')])).toEqual(Expression.parse(cpb("123 + -456")));
  expect(new Expression([nmm('123'), o('+'), n('-456')])).toEqual(Expression.parse(cpb("123mm + -456")));
  expect(new Expression([nmm('123'), o('+'), nmm('-456')])).toEqual(Expression.parse(cpb("123mm + -456mm")));
  expect(new Expression([n('123'), o('+'), nmm('-456')])).toEqual(Expression.parse(cpb("123 + -456mm")));
  expect(new Expression([n('123'), o('+'), n('456'), o('+'), n('789')])).toEqual(Expression.parse(cpb("123+456+789")));
  expect(new Expression([n('123'), o('+'), n('456'), o('+'), n('789')])).toEqual(Expression.parse(cpb("123 +456 + 789")));
  expect(new Expression([ob, n('123'), cb])).toEqual(Expression.parse(cpb("(123)")));
  expect(new Expression([ob, n('123'), cb])).toEqual(Expression.parse(cpb("(123)(456)")));
  expect(new Expression([ob, ob, n('123'), cb, cb])).toEqual(Expression.parse(cpb("((123))")));
  expect(new Expression([ob, ob, n('123'), cb, cb])).toEqual(Expression.parse(cpb("( (123 ))")));
  expect(new Expression([ob, ob, n('123'), cb, cb])).toEqual(Expression.parse(cpb("(( 123) )")));
  expect(new Expression([ob, ob, n('123'), cb, cb])).toEqual(Expression.parse(cpb(" ( ( 123) ) ")));
  expect(new Expression([ob, ob, n('123'), cb, cb])).toEqual(Expression.parse(cpb(" ( ( 123 ) ) ")));
  expect(new Expression([ob, ob, n('123'), o('+'), n('456'), cb, cb])).toEqual(Expression.parse(cpb(" ( ( 123+456 ) ) ")));
  expect(new Expression([ob, ob, n('123'), o('+'), n('456'), cb, cb])).toEqual(Expression.parse(cpb(" ( ( 123 + 456 ) ) ")));
  expect(new Expression([ob, ob, n('123'), o('+'), ob, n('456'), o('-'), n('3'), cb, cb, cb])).toEqual(Expression.parse(cpb(" ( ( 123 + (456-3) ) ) ")));
  expect(new Expression([
    ob, n('123'), o('+'), n('456'), cb,
    o('*'),
    n('789')
  ])).toEqual(Expression.parse(cpb("(123+456)*789")));
  expect(new Expression([
    n('123'),
    o('*'),
    ob, n('789'), o('/'), n('3.14'), cb
  ])).toEqual(Expression.parse(cpb("123*(789/3.14)")));
  expect(new Expression([
    ob, n('123'), cb,
    o('*'),
    ob, n('789'), o('/'), n('3.14'), cb
  ])).toEqual(Expression.parse(cpb("(123)*(789/3.14)")));
  expect(new Expression([
    ob, n('123'), o('+'), n('456'), cb,
    o('*'),
    ob, n('789'), o('/'), n('3.14'), cb
  ])).toEqual(Expression.parse(cpb("(123+456)*(789/3.14)")));

});

test('Expression invalid case', () => {
  expect(Expression.parse(cpb("123+"))).toBeNull();
  expect(Expression.parse(cpb("123 +"))).toBeNull();
  expect(Expression.parse(cpb("123 + "))).toBeNull();
  expect(Expression.parse(cpb("123 + -0"))).toBeNull();
  expect(Expression.parse(cpb("- 123"))).toBeNull();
  expect(Expression.parse(cpb("123 + - 1"))).toBeNull();
  expect(Expression.parse(cpb("(123"))).toBeNull();
  expect(Expression.parse(cpb("123 456"))).toBeNull(); // Due to NumberWithUnit token
});
