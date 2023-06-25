import { Zero, CodePointBuffer, isDelimiter, isSafeDelimiter, BooleanT, DecimalPoint, Digit1To9, Digit, DoubleQuoteString, Frac, Int, Minus, NegativeInt, NumberT, PositiveInt, SingleQuoteString, StringT, NumberWithUnit } from "./Tokens";

test("Test token delimiter methods", () => {
  expect(true).toBe(true);

  Zero.parse(new CodePointBuffer("0"));
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
  const t = BooleanT.parse(new CodePointBuffer("True"));
  if (!t) throw new Error("t is null");
  expect("True").toBe(t.value);
  expect(true).toBe(t.bool);

  expect(new BooleanT("True", true)).toEqual(BooleanT.parse(new CodePointBuffer("True")));
  expect(new BooleanT("true", true)).toEqual(BooleanT.parse(new CodePointBuffer("true")));
  expect(new BooleanT("False", false)).toEqual(BooleanT.parse(new CodePointBuffer("False")));
  expect(new BooleanT("false", false)).toEqual(BooleanT.parse(new CodePointBuffer("false")));
  expect(new BooleanT("True", true)).toEqual(BooleanT.parse(new CodePointBuffer("True ")));
  expect(new BooleanT("TrUe", true)).toEqual(BooleanT.parse(new CodePointBuffer("TrUe ")));
  expect(new BooleanT("fAlse", false)).toEqual(BooleanT.parse(new CodePointBuffer("fAlse")));
});

test('BooleanT invalid case', () => {
  expect(BooleanT.parse(new CodePointBuffer(""))).toBeNull();
  expect(BooleanT.parse(new CodePointBuffer("1"))).toBeNull();
  expect(BooleanT.parse(new CodePointBuffer("0"))).toBeNull();
  expect(BooleanT.parse(new CodePointBuffer(" "))).toBeNull();
  expect(BooleanT.parse(new CodePointBuffer(" True"))).toBeNull();
  expect(BooleanT.parse(new CodePointBuffer(""))).toBeNull();
});

test('DecimalPoint valid case', () => {
  expect(new DecimalPoint('.')).toEqual(DecimalPoint.parse(new CodePointBuffer(".")));
  expect(new DecimalPoint('.')).toEqual(DecimalPoint.parse(new CodePointBuffer(". ")));
  expect(new DecimalPoint('.')).toEqual(DecimalPoint.parse(new CodePointBuffer(".a")));
  expect(new DecimalPoint('.')).toEqual(DecimalPoint.parse(new CodePointBuffer(".123")));
});

test('DecimalPoint invalid case', () => {
  expect(DecimalPoint.parse(new CodePointBuffer(" ."))).toBeNull();
  expect(DecimalPoint.parse(new CodePointBuffer("0"))).toBeNull();
  expect(DecimalPoint.parse(new CodePointBuffer(" "))).toBeNull();
  expect(DecimalPoint.parse(new CodePointBuffer("a"))).toBeNull();
  expect(DecimalPoint.parse(new CodePointBuffer(""))).toBeNull();
  expect(DecimalPoint.parse(new CodePointBuffer("1 "))).toBeNull();
  expect(DecimalPoint.parse(new CodePointBuffer("-1"))).toBeNull();
  expect(DecimalPoint.parse(new CodePointBuffer("1"))).toBeNull();
});

test('Digit1To9 valid case', () => {
  expect(new Digit1To9('1')).toEqual(Digit1To9.parse(new CodePointBuffer("1")));
  expect(new Digit1To9('2')).toEqual(Digit1To9.parse(new CodePointBuffer("2")));
  expect(new Digit1To9('3')).toEqual(Digit1To9.parse(new CodePointBuffer("3")));
  expect(new Digit1To9('4')).toEqual(Digit1To9.parse(new CodePointBuffer("4")));
  expect(new Digit1To9('5')).toEqual(Digit1To9.parse(new CodePointBuffer("5")));
  expect(new Digit1To9('6')).toEqual(Digit1To9.parse(new CodePointBuffer("6")));
  expect(new Digit1To9('7')).toEqual(Digit1To9.parse(new CodePointBuffer("7")));
  expect(new Digit1To9('8')).toEqual(Digit1To9.parse(new CodePointBuffer("8")));
  expect(new Digit1To9('9')).toEqual(Digit1To9.parse(new CodePointBuffer("9")));
  expect(new Digit1To9('1')).toEqual(Digit1To9.parse(new CodePointBuffer("10")));
  expect(new Digit1To9('1')).toEqual(Digit1To9.parse(new CodePointBuffer("1 ")));
});

test('Digit1To9 invalid case', () => {
  expect(Digit1To9.parse(new CodePointBuffer("0"))).toBeNull();
  expect(Digit1To9.parse(new CodePointBuffer(" 1"))).toBeNull();
  expect(Digit1To9.parse(new CodePointBuffer("a"))).toBeNull();
  expect(Digit1To9.parse(new CodePointBuffer("A"))).toBeNull();
  expect(Digit1To9.parse(new CodePointBuffer(""))).toBeNull();
  expect(Digit1To9.parse(new CodePointBuffer("-1"))).toBeNull();
  expect(Digit1To9.parse(new CodePointBuffer(".123"))).toBeNull();
});

test('Digit valid case', () => {
  expect(new Digit('0')).toEqual(Digit.parse(new CodePointBuffer("0")));
  expect(new Digit('1')).toEqual(Digit.parse(new CodePointBuffer("1")));
  expect(new Digit('2')).toEqual(Digit.parse(new CodePointBuffer("2")));
  expect(new Digit('3')).toEqual(Digit.parse(new CodePointBuffer("3")));
  expect(new Digit('4')).toEqual(Digit.parse(new CodePointBuffer("4")));
  expect(new Digit('5')).toEqual(Digit.parse(new CodePointBuffer("5")));
  expect(new Digit('6')).toEqual(Digit.parse(new CodePointBuffer("6")));
  expect(new Digit('7')).toEqual(Digit.parse(new CodePointBuffer("7")));
  expect(new Digit('8')).toEqual(Digit.parse(new CodePointBuffer("8")));
  expect(new Digit('9')).toEqual(Digit.parse(new CodePointBuffer("9")));
  expect(new Digit('1')).toEqual(Digit.parse(new CodePointBuffer("1 ")));
});

test('Digit invalid case', () => {
  expect(Digit.parse(new CodePointBuffer(""))).toBeNull();
  expect(Digit.parse(new CodePointBuffer("-1"))).toBeNull();
  expect(Digit.parse(new CodePointBuffer("a"))).toBeNull();
  expect(Digit.parse(new CodePointBuffer("A"))).toBeNull();
  expect(Digit.parse(new CodePointBuffer(" "))).toBeNull();
  expect(Digit.parse(new CodePointBuffer(" 1"))).toBeNull();
  expect(Digit.parse(new CodePointBuffer(".22"))).toBeNull();
});

test('DoubleQuoteString valid case', () => {
  let t = new DoubleQuoteString("\"test\"", "test");
  expect("\"test\"").toEqual(t.value);
  expect("test").toEqual(t.content);

  expect(new DoubleQuoteString("\"\\\\\"", "\\")).toEqual(DoubleQuoteString.parse(new CodePointBuffer("\"\\\\\""))); // \
  expect(new DoubleQuoteString("\"\\\"\"", "\"")).toEqual(DoubleQuoteString.parse(new CodePointBuffer("\"\\\"\""))); // \"
  expect(new DoubleQuoteString("\"\\\\\\\"\"", "\\\"")).toEqual(DoubleQuoteString.parse(new CodePointBuffer("\"\\\\\\\"\""))); // \\"
  expect(new DoubleQuoteString("\"\\\\\\\\\"", "\\\\")).toEqual(DoubleQuoteString.parse(new CodePointBuffer("\"\\\\\\\\\""))); // \\
  expect(new DoubleQuoteString("\"test\\\\\"", "test\\")).toEqual(DoubleQuoteString.parse(new CodePointBuffer("\"test\\\\\""))); // test\
  expect(new DoubleQuoteString("\"test\\\"\"", "test\"")).toEqual(DoubleQuoteString.parse(new CodePointBuffer("\"test\\\"\""))); // test\"
  expect(new DoubleQuoteString("\"test\\\\\\\"\"", "test\\\"")).toEqual(DoubleQuoteString.parse(new CodePointBuffer("\"test\\\\\\\"\""))); // test\\"
  expect(new DoubleQuoteString("\"\"", "")).toEqual(DoubleQuoteString.parse(new CodePointBuffer("\"\""))); // empty
});

test('DoubleQuoteString invalid case', () => {
  expect(DoubleQuoteString.parse(new CodePointBuffer("test"))).toBeNull(); // no quote
  expect(DoubleQuoteString.parse(new CodePointBuffer(""))).toBeNull();
  expect(DoubleQuoteString.parse(new CodePointBuffer("234"))).toBeNull();
  expect(DoubleQuoteString.parse(new CodePointBuffer("\""))).toBeNull(); // missing end quote
  expect(DoubleQuoteString.parse(new CodePointBuffer("\"test"))).toBeNull();
  expect(DoubleQuoteString.parse(new CodePointBuffer("\"234"))).toBeNull();
});

test('Frac valid case', () => {
  expect(new Frac(".14")).toEqual(Frac.parse(new CodePointBuffer(".14")));
  expect(new Frac(".14")).toEqual(Frac.parse(new CodePointBuffer(".14.15")));
  expect(new Frac(".14")).toEqual(Frac.parse(new CodePointBuffer(".14 ")));
  expect(new Frac(".14")).toEqual(Frac.parse(new CodePointBuffer(".14abc")));
  expect(new Frac(".14")).toEqual(Frac.parse(new CodePointBuffer(".14\\")));
  expect(new Frac(".14")).toEqual(Frac.parse(new CodePointBuffer(".14\'")));
});

test('Frac invalid case', () => {
  expect(Frac.parse(new CodePointBuffer("."))).toBeNull();
  expect(Frac.parse(new CodePointBuffer("14"))).toBeNull();
  expect(Frac.parse(new CodePointBuffer(""))).toBeNull();
  expect(Frac.parse(new CodePointBuffer(" "))).toBeNull();
  expect(Frac.parse(new CodePointBuffer("abc"))).toBeNull();
  expect(Frac.parse(new CodePointBuffer("-123"))).toBeNull();
  expect(Frac.parse(new CodePointBuffer("3.14"))).toBeNull();
});

test('Int valid case', () => {
  expect(new Int("0")).toEqual(Int.parse(new CodePointBuffer("0")));
  expect(new Int("123")).toEqual(Int.parse(new CodePointBuffer("123")));
  expect(new Int("0")).toEqual(Int.parse(new CodePointBuffer("0 ")));
  expect(new Int("123")).toEqual(Int.parse(new CodePointBuffer("123 ")));
  expect(new Int("0")).toEqual(Int.parse(new CodePointBuffer("0.16")));
  expect(new Int("3")).toEqual(Int.parse(new CodePointBuffer("3.14")));
});

test('Int invalid case', () => {
  expect(Int.parse(new CodePointBuffer("abc"))).toBeNull();
  expect(Int.parse(new CodePointBuffer(""))).toBeNull();
  expect(Int.parse(new CodePointBuffer(" "))).toBeNull();
  expect(Int.parse(new CodePointBuffer(".14"))).toBeNull();
});

test('Minus valid case', () => {
  expect(new Minus("-")).toEqual(Minus.parse(new CodePointBuffer("-")));
  expect(new Minus("-")).toEqual(Minus.parse(new CodePointBuffer("- ")));
});

test('Minus invalid case', () => {
  expect(Minus.parse(new CodePointBuffer(""))).toBeNull();
  expect(Minus.parse(new CodePointBuffer("0"))).toBeNull();
  expect(Minus.parse(new CodePointBuffer(" -"))).toBeNull();
  expect(Minus.parse(new CodePointBuffer("a"))).toBeNull();
  expect(Minus.parse(new CodePointBuffer("1"))).toBeNull();
  expect(Minus.parse(new CodePointBuffer("a-"))).toBeNull();
  expect(Minus.parse(new CodePointBuffer("1-"))).toBeNull();
});

test('NegativeInt valid case', () => {
  expect(new NegativeInt("-123")).toEqual(NegativeInt.parse(new CodePointBuffer("-123")));
  expect(new NegativeInt("-123")).toEqual(NegativeInt.parse(new CodePointBuffer("-123abc")));
  expect(new NegativeInt("-123")).toEqual(NegativeInt.parse(new CodePointBuffer("-123 ")));
  expect(new NegativeInt("-123")).toEqual(NegativeInt.parse(new CodePointBuffer("-123 456")));
  expect(new NegativeInt("-3")).toEqual(NegativeInt.parse(new CodePointBuffer("-3.14")));
});

test('NegativeInt invalid case', () => {
  expect(NegativeInt.parse(new CodePointBuffer("abc"))).toBeNull();
  expect(NegativeInt.parse(new CodePointBuffer(""))).toBeNull();
  expect(NegativeInt.parse(new CodePointBuffer("123"))).toBeNull();
  expect(NegativeInt.parse(new CodePointBuffer("0123"))).toBeNull();
  expect(NegativeInt.parse(new CodePointBuffer(".14"))).toBeNull();
});

test('NumberT valid case', () => {
  const number = NumberT.parse(new CodePointBuffer("0"));
  if (number === null) throw new Error("t is null");
  expect(number.value).toEqual("0");
  expect(number.isPositive).toBeTruthy();
  expect(number.isDouble).toBeFalsy();
  expect(NumberT.parse(new CodePointBuffer("14a"))?.toInt()).toEqual(14);
  expect(new NumberT("0", true, false)).toEqual(NumberT.parse(new CodePointBuffer("0")));
  expect(new NumberT("-14", false, false)).toEqual(NumberT.parse(new CodePointBuffer("-14")));
  expect(new NumberT("14", true, false)).toEqual(NumberT.parse(new CodePointBuffer("14")));
  expect(new NumberT("3.14", true, true)).toEqual(NumberT.parse(new CodePointBuffer("3.14 ")));
  expect(new NumberT("-3.14", false, true)).toEqual(NumberT.parse(new CodePointBuffer("-3.14")));
  expect(new NumberT("14", true, false)).toEqual(NumberT.parse(new CodePointBuffer("14\\")));
  expect(new NumberT("14", true, false)).toEqual(NumberT.parse(new CodePointBuffer("14\'")));
  expect(new NumberT("14", true, false)).toEqual(NumberT.parse(new CodePointBuffer("14\"")));
  expect(new NumberT("14", true, false)).toEqual(NumberT.parse(new CodePointBuffer("14 ")));
  expect(new NumberT("-14", false, false)).toEqual(NumberT.parse(new CodePointBuffer("-14\\")));
  expect(new NumberT("-14", false, false)).toEqual(NumberT.parse(new CodePointBuffer("-14\'")));
  expect(new NumberT("-14", false, false)).toEqual(NumberT.parse(new CodePointBuffer("-14\"")));
  expect(new NumberT("-14", false, false)).toEqual(NumberT.parse(new CodePointBuffer("-14 ")));
  expect(new NumberT("3.14", true, true)).toEqual(NumberT.parse(new CodePointBuffer("3.14\\")));
  expect(new NumberT("3.14", true, true)).toEqual(NumberT.parse(new CodePointBuffer("3.14\'")));
  expect(new NumberT("3.14", true, true)).toEqual(NumberT.parse(new CodePointBuffer("3.14\"")));
  expect(new NumberT("3.14", true, true)).toEqual(NumberT.parse(new CodePointBuffer("3.14 ")));
  expect(new NumberT("-3.14", false, true)).toEqual(NumberT.parse(new CodePointBuffer("-3.14\\")));
  expect(new NumberT("-3.14", false, true)).toEqual(NumberT.parse(new CodePointBuffer("-3.14\'")));
  expect(new NumberT("-3.14", false, true)).toEqual(NumberT.parse(new CodePointBuffer("-3.14\"")));
  expect(new NumberT("-3.14", false, true)).toEqual(NumberT.parse(new CodePointBuffer("-3.14 ")));
});

test('NumberT invalid case', () => {
  expect(NumberT.parse(new CodePointBuffer("-"))).toBeNull();
  expect(NumberT.parse(new CodePointBuffer(""))).toBeNull();
  expect(NumberT.parse(new CodePointBuffer(" "))).toBeNull();
  expect(NumberT.parse(new CodePointBuffer("a"))).toBeNull();
  expect(NumberT.parse(new CodePointBuffer("a14"))).toBeNull();
  expect(NumberT.parse(new CodePointBuffer("a3.14"))).toBeNull();
  expect(NumberT.parse(new CodePointBuffer("a-14"))).toBeNull();
  expect(NumberT.parse(new CodePointBuffer("a-3.14"))).toBeNull();
  expect(NumberT.parse(new CodePointBuffer("a14 "))).toBeNull();
  expect(NumberT.parse(new CodePointBuffer("a3.14 "))).toBeNull();
  expect(NumberT.parse(new CodePointBuffer("a-14 "))).toBeNull();
  expect(NumberT.parse(new CodePointBuffer("a-3.14 "))).toBeNull();
});

test('PositiveInt valid case', () => {
  expect(new PositiveInt("123")).toEqual(PositiveInt.parse(new CodePointBuffer("123")));
  expect(new PositiveInt("123")).toEqual(PositiveInt.parse(new CodePointBuffer("123abc")));
  expect(new PositiveInt("123")).toEqual(PositiveInt.parse(new CodePointBuffer("123 ")));
  expect(new PositiveInt("123")).toEqual(PositiveInt.parse(new CodePointBuffer("123 456")));
  expect(new PositiveInt("3")).toEqual(PositiveInt.parse(new CodePointBuffer("3.14")));
});

test('PositiveInt invalid case', () => {
  expect(PositiveInt.parse(new CodePointBuffer("abc"))).toBeNull();
  expect(PositiveInt.parse(new CodePointBuffer(""))).toBeNull();
  expect(PositiveInt.parse(new CodePointBuffer("-1"))).toBeNull();
  expect(PositiveInt.parse(new CodePointBuffer("0123"))).toBeNull();
  expect(PositiveInt.parse(new CodePointBuffer(".14"))).toBeNull();
});

test('SingleQuoteString valid case', () => {
  expect(new SingleQuoteString("'\\\\'", "\\")).toEqual(SingleQuoteString.parse(new CodePointBuffer("'\\\\'"))); // \
  expect(new SingleQuoteString("'\\''", "'")).toEqual(SingleQuoteString.parse(new CodePointBuffer("'\\''"))); // '
  expect(new SingleQuoteString("'\\\\\\''", "\\'")).toEqual(SingleQuoteString.parse(new CodePointBuffer("'\\\\\\''"))); // \'
  expect(new SingleQuoteString("'\\\\\\\\'", "\\\\")).toEqual(SingleQuoteString.parse(new CodePointBuffer("'\\\\\\\\'"))); // \\
  expect(new SingleQuoteString("'test\\\\'", "test\\")).toEqual(SingleQuoteString.parse(new CodePointBuffer("'test\\\\'"))); // test\
  expect(new SingleQuoteString("'test\\''", "test'")).toEqual(SingleQuoteString.parse(new CodePointBuffer("'test\\''"))); // test'
  expect(new SingleQuoteString("'test\\\\\\''", "test\\'")).toEqual(SingleQuoteString.parse(new CodePointBuffer("'test\\\\\\''"))); // test\'
  expect(new SingleQuoteString("''", "")).toEqual(SingleQuoteString.parse(new CodePointBuffer("''"))); // empty
});

test('SingleQuoteString invalid case', () => {
  expect(SingleQuoteString.parse(new CodePointBuffer("test"))).toBeNull(); // no quote
  expect(SingleQuoteString.parse(new CodePointBuffer(""))).toBeNull();
  expect(SingleQuoteString.parse(new CodePointBuffer("234"))).toBeNull();
  expect(SingleQuoteString.parse(new CodePointBuffer("'"))).toBeNull(); // missing end quote
  expect(SingleQuoteString.parse(new CodePointBuffer("'test"))).toBeNull();
  expect(SingleQuoteString.parse(new CodePointBuffer("'234"))).toBeNull();
});

test('StringT valid case', () => {
  expect(new StringT("test")).toEqual(StringT.parse(new CodePointBuffer("test")));// test
  expect(new StringT("")).toEqual(StringT.parse(new CodePointBuffer(" ")));// empty
  expect(new StringT("test")).toEqual(StringT.parse(new CodePointBuffer("test test")));// test
  expect(new StringT("test")).toEqual(StringT.parse(new CodePointBuffer("'test'"))); // 'test'
  expect(new StringT("test")).toEqual(StringT.parse(new CodePointBuffer("\"test\""))); // "test"
  expect(new StringT("\\")).toEqual(StringT.parse(new CodePointBuffer("'\\\\'"))); // '\\'
  expect(new StringT("'")).toEqual(StringT.parse(new CodePointBuffer("'\\''"))); // '\''
  expect(new StringT("\\")).toEqual(StringT.parse(new CodePointBuffer("\"\\\\\""))); // "\\"
  expect(new StringT("\"")).toEqual(StringT.parse(new CodePointBuffer("'\\\"'"))); // '\"'
  expect(new StringT("\\test")).toEqual(StringT.parse(new CodePointBuffer("'\\\\test'"))); // '\\test'
  expect(new StringT("\\test")).toEqual(StringT.parse(new CodePointBuffer("\"\\\\test\""))); // "\\test"
});

test('StringT invalid case', () => {
  expect(StringT.parse(new CodePointBuffer(""))).toBeNull(); // empty
  expect(StringT.parse(new CodePointBuffer("'"))).toBeNull(); // '
  expect(StringT.parse(new CodePointBuffer("\""))).toBeNull(); // "
  expect(StringT.parse(new CodePointBuffer("'test"))).toBeNull();// 'test
  expect(StringT.parse(new CodePointBuffer("\"test"))).toBeNull();// "test
  expect(StringT.parse(new CodePointBuffer("'test\""))).toBeNull();// 'test"
  expect(StringT.parse(new CodePointBuffer("\"test'"))).toBeNull();// "test'
});

test('Zero valid case', () => {
  expect(new Zero('0')).toEqual(Zero.parse(new CodePointBuffer("0")));
  expect(new Zero('0')).toEqual(Zero.parse(new CodePointBuffer("0 ")));
});

test('Zero invalid case', () => {
  expect(Zero.parse(new CodePointBuffer("1"))).toBeNull();
  expect(Zero.parse(new CodePointBuffer("a"))).toBeNull();
  expect(Zero.parse(new CodePointBuffer(" "))).toBeNull();
  expect(Zero.parse(new CodePointBuffer(""))).toBeNull();
  expect(Zero.parse(new CodePointBuffer("-"))).toBeNull();
  expect(Zero.parse(new CodePointBuffer(" 0"))).toBeNull();
});

test('NumberWithUnit valid case', () => {
  expect(new NumberWithUnit('0', null)).toEqual(NumberWithUnit.parse(new CodePointBuffer("0")));
});
