import { Tokens } from "./Tokens";

test("Test token delimiter methods", () => {
  expect(true).toBe(true);

  Tokens.Zero.parse(new Tokens.CodePointBuffer("0"));
});

test('Token delimiter methods', () => {
  expect(Tokens.isDelimiter(' ')).toBe(true);
  expect(Tokens.isDelimiter(null)).toBe(true);
  expect(Tokens.isDelimiter('\'')).toBe(false);
  expect(Tokens.isSafeDelimiter(null)).toBe(true);
  expect(Tokens.isSafeDelimiter(' ')).toBe(true);
  expect(Tokens.isSafeDelimiter(':')).toBe(true);
  expect(Tokens.isSafeDelimiter(',')).toBe(true);
  expect(Tokens.isSafeDelimiter('\'')).toBe(false);
});

test('BooleanT valid case', () => {
  const t = Tokens.BooleanT.parse(new Tokens.CodePointBuffer("True"));
  if (!t) throw new Error("t is null");
  expect("True").toBe(t.value);
  expect(true).toBe(t.bool);

  expect(new Tokens.BooleanT("True", true)).toEqual(Tokens.BooleanT.parse(new Tokens.CodePointBuffer("True")));
  expect(new Tokens.BooleanT("true", true)).toEqual(Tokens.BooleanT.parse(new Tokens.CodePointBuffer("true")));
  expect(new Tokens.BooleanT("False", false)).toEqual(Tokens.BooleanT.parse(new Tokens.CodePointBuffer("False")));
  expect(new Tokens.BooleanT("false", false)).toEqual(Tokens.BooleanT.parse(new Tokens.CodePointBuffer("false")));
  expect(new Tokens.BooleanT("True", true)).toEqual(Tokens.BooleanT.parse(new Tokens.CodePointBuffer("True ")));
  expect(new Tokens.BooleanT("TrUe", true)).toEqual(Tokens.BooleanT.parse(new Tokens.CodePointBuffer("TrUe ")));
  expect(new Tokens.BooleanT("fAlse", false)).toEqual(Tokens.BooleanT.parse(new Tokens.CodePointBuffer("fAlse")));
});

test('BooleanT invalid case', () => {
  expect(Tokens.BooleanT.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.BooleanT.parse(new Tokens.CodePointBuffer("1"))).toBeNull();
  expect(Tokens.BooleanT.parse(new Tokens.CodePointBuffer("0"))).toBeNull();
  expect(Tokens.BooleanT.parse(new Tokens.CodePointBuffer(" "))).toBeNull();
  expect(Tokens.BooleanT.parse(new Tokens.CodePointBuffer(" True"))).toBeNull();
  expect(Tokens.BooleanT.parse(new Tokens.CodePointBuffer(""))).toBeNull();
});

test('DecimalPoint valid case', () => {
  expect(new Tokens.DecimalPoint('.')).toEqual(Tokens.DecimalPoint.parse(new Tokens.CodePointBuffer(".")));
  expect(new Tokens.DecimalPoint('.')).toEqual(Tokens.DecimalPoint.parse(new Tokens.CodePointBuffer(". ")));
  expect(new Tokens.DecimalPoint('.')).toEqual(Tokens.DecimalPoint.parse(new Tokens.CodePointBuffer(".a")));
  expect(new Tokens.DecimalPoint('.')).toEqual(Tokens.DecimalPoint.parse(new Tokens.CodePointBuffer(".123")));
});

test('DecimalPoint invalid case', () => {
  expect(Tokens.DecimalPoint.parse(new Tokens.CodePointBuffer(" ."))).toBeNull();
  expect(Tokens.DecimalPoint.parse(new Tokens.CodePointBuffer("0"))).toBeNull();
  expect(Tokens.DecimalPoint.parse(new Tokens.CodePointBuffer(" "))).toBeNull();
  expect(Tokens.DecimalPoint.parse(new Tokens.CodePointBuffer("a"))).toBeNull();
  expect(Tokens.DecimalPoint.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.DecimalPoint.parse(new Tokens.CodePointBuffer("1 "))).toBeNull();
  expect(Tokens.DecimalPoint.parse(new Tokens.CodePointBuffer("-1"))).toBeNull();
  expect(Tokens.DecimalPoint.parse(new Tokens.CodePointBuffer("1"))).toBeNull();
});

test('Digit1To9 valid case', () => {
  expect(new Tokens.Digit1To9('1')).toEqual(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("1")));
  expect(new Tokens.Digit1To9('2')).toEqual(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("2")));
  expect(new Tokens.Digit1To9('3')).toEqual(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("3")));
  expect(new Tokens.Digit1To9('4')).toEqual(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("4")));
  expect(new Tokens.Digit1To9('5')).toEqual(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("5")));
  expect(new Tokens.Digit1To9('6')).toEqual(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("6")));
  expect(new Tokens.Digit1To9('7')).toEqual(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("7")));
  expect(new Tokens.Digit1To9('8')).toEqual(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("8")));
  expect(new Tokens.Digit1To9('9')).toEqual(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("9")));
  expect(new Tokens.Digit1To9('1')).toEqual(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("10")));
  expect(new Tokens.Digit1To9('1')).toEqual(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("1 ")));
});

test('Digit1To9 invalid case', () => {
  expect(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("0"))).toBeNull();
  expect(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer(" 1"))).toBeNull();
  expect(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("a"))).toBeNull();
  expect(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("A"))).toBeNull();
  expect(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer("-1"))).toBeNull();
  expect(Tokens.Digit1To9.parse(new Tokens.CodePointBuffer(".123"))).toBeNull();
});

test('Digit valid case', () => {
  expect(new Tokens.Digit('0')).toEqual(Tokens.Digit.parse(new Tokens.CodePointBuffer("0")));
  expect(new Tokens.Digit('1')).toEqual(Tokens.Digit.parse(new Tokens.CodePointBuffer("1")));
  expect(new Tokens.Digit('2')).toEqual(Tokens.Digit.parse(new Tokens.CodePointBuffer("2")));
  expect(new Tokens.Digit('3')).toEqual(Tokens.Digit.parse(new Tokens.CodePointBuffer("3")));
  expect(new Tokens.Digit('4')).toEqual(Tokens.Digit.parse(new Tokens.CodePointBuffer("4")));
  expect(new Tokens.Digit('5')).toEqual(Tokens.Digit.parse(new Tokens.CodePointBuffer("5")));
  expect(new Tokens.Digit('6')).toEqual(Tokens.Digit.parse(new Tokens.CodePointBuffer("6")));
  expect(new Tokens.Digit('7')).toEqual(Tokens.Digit.parse(new Tokens.CodePointBuffer("7")));
  expect(new Tokens.Digit('8')).toEqual(Tokens.Digit.parse(new Tokens.CodePointBuffer("8")));
  expect(new Tokens.Digit('9')).toEqual(Tokens.Digit.parse(new Tokens.CodePointBuffer("9")));
  expect(new Tokens.Digit('1')).toEqual(Tokens.Digit.parse(new Tokens.CodePointBuffer("1 ")));
});

test('Digit invalid case', () => {
  expect(Tokens.Digit.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.Digit.parse(new Tokens.CodePointBuffer("-1"))).toBeNull();
  expect(Tokens.Digit.parse(new Tokens.CodePointBuffer("a"))).toBeNull();
  expect(Tokens.Digit.parse(new Tokens.CodePointBuffer("A"))).toBeNull();
  expect(Tokens.Digit.parse(new Tokens.CodePointBuffer(" "))).toBeNull();
  expect(Tokens.Digit.parse(new Tokens.CodePointBuffer(" 1"))).toBeNull();
  expect(Tokens.Digit.parse(new Tokens.CodePointBuffer(".22"))).toBeNull();
});

test('DoubleQuoteString valid case', () => {
  let t = new Tokens.DoubleQuoteString("\"test\"", "test");
  expect("\"test\"").toEqual(t.value);
  expect("test").toEqual(t.content);

  expect(new Tokens.DoubleQuoteString("\"\\\\\"", "\\")).toEqual(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("\"\\\\\""))); // \
  expect(new Tokens.DoubleQuoteString("\"\\\"\"", "\"")).toEqual(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("\"\\\"\""))); // \"
  expect(new Tokens.DoubleQuoteString("\"\\\\\\\"\"", "\\\"")).toEqual(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("\"\\\\\\\"\""))); // \\"
  expect(new Tokens.DoubleQuoteString("\"\\\\\\\\\"", "\\\\")).toEqual(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("\"\\\\\\\\\""))); // \\
  expect(new Tokens.DoubleQuoteString("\"test\\\\\"", "test\\")).toEqual(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("\"test\\\\\""))); // test\
  expect(new Tokens.DoubleQuoteString("\"test\\\"\"", "test\"")).toEqual(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("\"test\\\"\""))); // test\"
  expect(new Tokens.DoubleQuoteString("\"test\\\\\\\"\"", "test\\\"")).toEqual(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("\"test\\\\\\\"\""))); // test\\"
  expect(new Tokens.DoubleQuoteString("\"\"", "")).toEqual(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("\"\""))); // empty
});

test('DoubleQuoteString invalid case', () => {
  expect(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("test"))).toBeNull(); // no quote
  expect(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("234"))).toBeNull();
  expect(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("\""))).toBeNull(); // missing end quote
  expect(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("\"test"))).toBeNull();
  expect(Tokens.DoubleQuoteString.parse(new Tokens.CodePointBuffer("\"234"))).toBeNull();
});

test('Frac valid case', () => {
  expect(new Tokens.Frac(".14")).toEqual(Tokens.Frac.parse(new Tokens.CodePointBuffer(".14")));
  expect(new Tokens.Frac(".14")).toEqual(Tokens.Frac.parse(new Tokens.CodePointBuffer(".14.15")));
  expect(new Tokens.Frac(".14")).toEqual(Tokens.Frac.parse(new Tokens.CodePointBuffer(".14 ")));
  expect(new Tokens.Frac(".14")).toEqual(Tokens.Frac.parse(new Tokens.CodePointBuffer(".14abc")));
  expect(new Tokens.Frac(".14")).toEqual(Tokens.Frac.parse(new Tokens.CodePointBuffer(".14\\")));
  expect(new Tokens.Frac(".14")).toEqual(Tokens.Frac.parse(new Tokens.CodePointBuffer(".14\'")));
});

test('Frac invalid case', () => {
  expect(Tokens.Frac.parse(new Tokens.CodePointBuffer("."))).toBeNull();
  expect(Tokens.Frac.parse(new Tokens.CodePointBuffer("14"))).toBeNull();
  expect(Tokens.Frac.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.Frac.parse(new Tokens.CodePointBuffer(" "))).toBeNull();
  expect(Tokens.Frac.parse(new Tokens.CodePointBuffer("abc"))).toBeNull();
  expect(Tokens.Frac.parse(new Tokens.CodePointBuffer("-123"))).toBeNull();
  expect(Tokens.Frac.parse(new Tokens.CodePointBuffer("3.14"))).toBeNull();
});

test('Int valid case', () => {
  expect(new Tokens.Int("0")).toEqual(Tokens.Int.parse(new Tokens.CodePointBuffer("0")));
  expect(new Tokens.Int("123")).toEqual(Tokens.Int.parse(new Tokens.CodePointBuffer("123")));
  expect(new Tokens.Int("0")).toEqual(Tokens.Int.parse(new Tokens.CodePointBuffer("0 ")));
  expect(new Tokens.Int("123")).toEqual(Tokens.Int.parse(new Tokens.CodePointBuffer("123 ")));
  expect(new Tokens.Int("0")).toEqual(Tokens.Int.parse(new Tokens.CodePointBuffer("0.16")));
  expect(new Tokens.Int("3")).toEqual(Tokens.Int.parse(new Tokens.CodePointBuffer("3.14")));
});

test('Int invalid case', () => {
  expect(Tokens.Int.parse(new Tokens.CodePointBuffer("abc"))).toBeNull();
  expect(Tokens.Int.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.Int.parse(new Tokens.CodePointBuffer(" "))).toBeNull();
  expect(Tokens.Int.parse(new Tokens.CodePointBuffer(".14"))).toBeNull();
});

test('Minus valid case', () => {
  expect(new Tokens.Minus("-")).toEqual(Tokens.Minus.parse(new Tokens.CodePointBuffer("-")));
  expect(new Tokens.Minus("-")).toEqual(Tokens.Minus.parse(new Tokens.CodePointBuffer("- ")));
});

test('Minus invalid case', () => {
  expect(Tokens.Minus.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.Minus.parse(new Tokens.CodePointBuffer("0"))).toBeNull();
  expect(Tokens.Minus.parse(new Tokens.CodePointBuffer(" -"))).toBeNull();
  expect(Tokens.Minus.parse(new Tokens.CodePointBuffer("a"))).toBeNull();
  expect(Tokens.Minus.parse(new Tokens.CodePointBuffer("1"))).toBeNull();
  expect(Tokens.Minus.parse(new Tokens.CodePointBuffer("a-"))).toBeNull();
  expect(Tokens.Minus.parse(new Tokens.CodePointBuffer("1-"))).toBeNull();
});

test('NegativeInt valid case', () => {
  expect(new Tokens.NegativeInt("-123")).toEqual(Tokens.NegativeInt.parse(new Tokens.CodePointBuffer("-123")));
  expect(new Tokens.NegativeInt("-123")).toEqual(Tokens.NegativeInt.parse(new Tokens.CodePointBuffer("-123abc")));
  expect(new Tokens.NegativeInt("-123")).toEqual(Tokens.NegativeInt.parse(new Tokens.CodePointBuffer("-123 ")));
  expect(new Tokens.NegativeInt("-123")).toEqual(Tokens.NegativeInt.parse(new Tokens.CodePointBuffer("-123 456")));
  expect(new Tokens.NegativeInt("-3")).toEqual(Tokens.NegativeInt.parse(new Tokens.CodePointBuffer("-3.14")));
});

test('NegativeInt invalid case', () => {
  expect(Tokens.NegativeInt.parse(new Tokens.CodePointBuffer("abc"))).toBeNull();
  expect(Tokens.NegativeInt.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.NegativeInt.parse(new Tokens.CodePointBuffer("123"))).toBeNull();
  expect(Tokens.NegativeInt.parse(new Tokens.CodePointBuffer("0123"))).toBeNull();
  expect(Tokens.NegativeInt.parse(new Tokens.CodePointBuffer(".14"))).toBeNull();
});

test('NumberT valid case', () => {
  const number = Tokens.NumberT.parse(new Tokens.CodePointBuffer("0"));
  if (number === null) throw new Error("t is null");
  expect(number.value).toEqual("0");
  expect(number.isPositive).toBeTruthy();
  expect(number.isDouble).toBeFalsy();
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer("14a"))?.toInt()).toEqual(14);
  expect(new Tokens.NumberT("0", true, false)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("0")));
  expect(new Tokens.NumberT("-14", false, false)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("-14")));
  expect(new Tokens.NumberT("14", true, false)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("14")));
  expect(new Tokens.NumberT("3.14", true, true)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("3.14 ")));
  expect(new Tokens.NumberT("-3.14", false, true)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("-3.14")));
  expect(new Tokens.NumberT("14", true, false)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("14\\")));
  expect(new Tokens.NumberT("14", true, false)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("14\'")));
  expect(new Tokens.NumberT("14", true, false)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("14\"")));
  expect(new Tokens.NumberT("14", true, false)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("14 ")));
  expect(new Tokens.NumberT("-14", false, false)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("-14\\")));
  expect(new Tokens.NumberT("-14", false, false)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("-14\'")));
  expect(new Tokens.NumberT("-14", false, false)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("-14\"")));
  expect(new Tokens.NumberT("-14", false, false)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("-14 ")));
  expect(new Tokens.NumberT("3.14", true, true)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("3.14\\")));
  expect(new Tokens.NumberT("3.14", true, true)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("3.14\'")));
  expect(new Tokens.NumberT("3.14", true, true)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("3.14\"")));
  expect(new Tokens.NumberT("3.14", true, true)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("3.14 ")));
  expect(new Tokens.NumberT("-3.14", false, true)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("-3.14\\")));
  expect(new Tokens.NumberT("-3.14", false, true)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("-3.14\'")));
  expect(new Tokens.NumberT("-3.14", false, true)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("-3.14\"")));
  expect(new Tokens.NumberT("-3.14", false, true)).toEqual(Tokens.NumberT.parse(new Tokens.CodePointBuffer("-3.14 ")));
});

test('NumberT invalid case', () => {
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer("-"))).toBeNull();
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer(" "))).toBeNull();
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer("a"))).toBeNull();
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer("a14"))).toBeNull();
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer("a3.14"))).toBeNull();
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer("a-14"))).toBeNull();
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer("a-3.14"))).toBeNull();
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer("a14 "))).toBeNull();
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer("a3.14 "))).toBeNull();
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer("a-14 "))).toBeNull();
  expect(Tokens.NumberT.parse(new Tokens.CodePointBuffer("a-3.14 "))).toBeNull();
});

test('PositiveInt valid case', () => {
  expect(new Tokens.PositiveInt("123")).toEqual(Tokens.PositiveInt.parse(new Tokens.CodePointBuffer("123")));
  expect(new Tokens.PositiveInt("123")).toEqual(Tokens.PositiveInt.parse(new Tokens.CodePointBuffer("123abc")));
  expect(new Tokens.PositiveInt("123")).toEqual(Tokens.PositiveInt.parse(new Tokens.CodePointBuffer("123 ")));
  expect(new Tokens.PositiveInt("123")).toEqual(Tokens.PositiveInt.parse(new Tokens.CodePointBuffer("123 456")));
  expect(new Tokens.PositiveInt("3")).toEqual(Tokens.PositiveInt.parse(new Tokens.CodePointBuffer("3.14")));
});

test('PositiveInt invalid case', () => {
  expect(Tokens.PositiveInt.parse(new Tokens.CodePointBuffer("abc"))).toBeNull();
  expect(Tokens.PositiveInt.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.PositiveInt.parse(new Tokens.CodePointBuffer("-1"))).toBeNull();
  expect(Tokens.PositiveInt.parse(new Tokens.CodePointBuffer("0123"))).toBeNull();
  expect(Tokens.PositiveInt.parse(new Tokens.CodePointBuffer(".14"))).toBeNull();
});

test('SingleQuoteString valid case', () => {
  expect(new Tokens.SingleQuoteString("'\\\\'", "\\")).toEqual(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("'\\\\'"))); // \
  expect(new Tokens.SingleQuoteString("'\\''", "'")).toEqual(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("'\\''"))); // '
  expect(new Tokens.SingleQuoteString("'\\\\\\''", "\\'")).toEqual(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("'\\\\\\''"))); // \'
  expect(new Tokens.SingleQuoteString("'\\\\\\\\'", "\\\\")).toEqual(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("'\\\\\\\\'"))); // \\
  expect(new Tokens.SingleQuoteString("'test\\\\'", "test\\")).toEqual(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("'test\\\\'"))); // test\
  expect(new Tokens.SingleQuoteString("'test\\''", "test'")).toEqual(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("'test\\''"))); // test'
  expect(new Tokens.SingleQuoteString("'test\\\\\\''", "test\\'")).toEqual(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("'test\\\\\\''"))); // test\'
  expect(new Tokens.SingleQuoteString("''", "")).toEqual(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("''"))); // empty
});

test('SingleQuoteString invalid case', () => {
  expect(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("test"))).toBeNull(); // no quote
  expect(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("234"))).toBeNull();
  expect(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("'"))).toBeNull(); // missing end quote
  expect(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("'test"))).toBeNull();
  expect(Tokens.SingleQuoteString.parse(new Tokens.CodePointBuffer("'234"))).toBeNull();
});

test('StringT valid case', () => {
  expect(new Tokens.StringT("test")).toEqual(Tokens.StringT.parse(new Tokens.CodePointBuffer("test")));// test
  expect(new Tokens.StringT("")).toEqual(Tokens.StringT.parse(new Tokens.CodePointBuffer(" ")));// empty
  expect(new Tokens.StringT("test")).toEqual(Tokens.StringT.parse(new Tokens.CodePointBuffer("test test")));// test
  expect(new Tokens.StringT("test")).toEqual(Tokens.StringT.parse(new Tokens.CodePointBuffer("'test'"))); // 'test'
  expect(new Tokens.StringT("test")).toEqual(Tokens.StringT.parse(new Tokens.CodePointBuffer("\"test\""))); // "test"
  expect(new Tokens.StringT("\\")).toEqual(Tokens.StringT.parse(new Tokens.CodePointBuffer("'\\\\'"))); // '\\'
  expect(new Tokens.StringT("'")).toEqual(Tokens.StringT.parse(new Tokens.CodePointBuffer("'\\''"))); // '\''
  expect(new Tokens.StringT("\\")).toEqual(Tokens.StringT.parse(new Tokens.CodePointBuffer("\"\\\\\""))); // "\\"
  expect(new Tokens.StringT("\"")).toEqual(Tokens.StringT.parse(new Tokens.CodePointBuffer("'\\\"'"))); // '\"'
  expect(new Tokens.StringT("\\test")).toEqual(Tokens.StringT.parse(new Tokens.CodePointBuffer("'\\\\test'"))); // '\\test'
  expect(new Tokens.StringT("\\test")).toEqual(Tokens.StringT.parse(new Tokens.CodePointBuffer("\"\\\\test\""))); // "\\test"
});

test('StringT invalid case', () => {
  expect(Tokens.StringT.parse(new Tokens.CodePointBuffer(""))).toBeNull(); // empty
  expect(Tokens.StringT.parse(new Tokens.CodePointBuffer("'"))).toBeNull(); // '
  expect(Tokens.StringT.parse(new Tokens.CodePointBuffer("\""))).toBeNull(); // "
  expect(Tokens.StringT.parse(new Tokens.CodePointBuffer("'test"))).toBeNull();// 'test
  expect(Tokens.StringT.parse(new Tokens.CodePointBuffer("\"test"))).toBeNull();// "test
  expect(Tokens.StringT.parse(new Tokens.CodePointBuffer("'test\""))).toBeNull();// 'test"
  expect(Tokens.StringT.parse(new Tokens.CodePointBuffer("\"test'"))).toBeNull();// "test'
});

test('Zero valid case', () => {
  expect(new Tokens.Zero('0')).toEqual(Tokens.Zero.parse(new Tokens.CodePointBuffer("0")));
  expect(new Tokens.Zero('0')).toEqual(Tokens.Zero.parse(new Tokens.CodePointBuffer("0 ")));
});

test('Zero invalid case', () => {
  expect(Tokens.Zero.parse(new Tokens.CodePointBuffer("1"))).toBeNull();
  expect(Tokens.Zero.parse(new Tokens.CodePointBuffer("a"))).toBeNull();
  expect(Tokens.Zero.parse(new Tokens.CodePointBuffer(" "))).toBeNull();
  expect(Tokens.Zero.parse(new Tokens.CodePointBuffer(""))).toBeNull();
  expect(Tokens.Zero.parse(new Tokens.CodePointBuffer("-"))).toBeNull();
  expect(Tokens.Zero.parse(new Tokens.CodePointBuffer(" 0"))).toBeNull();
});
