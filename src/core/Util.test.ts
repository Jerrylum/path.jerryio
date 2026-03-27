import { validate } from "class-validator";
import { EditableNumberRange, ValidateEditableNumberRange, ValidateNumber } from "./Util";
import { Expose } from "class-transformer";

class TestClass {
  @ValidateNumber(num => num >= 5 && num <= 10)
  attr1;

  constructor(attr1: number) {
    this.attr1 = attr1;
  }
}

test("ValidateNumber", async () => {
  expect(await validate(new TestClass(4))).toHaveLength(1);
  expect(await validate(new TestClass(5))).toHaveLength(0);
  expect(await validate(new TestClass(10))).toHaveLength(0);
  expect(await validate(new TestClass(11))).toHaveLength(1);
});

class TestClass2 {
  @ValidateEditableNumberRange(-10, 10)
  @Expose()
  attr1: EditableNumberRange = {
    minLimit: { value: -9, label: "0" },
    maxLimit: { value: 9, label: "5" },
    step: 1,
    from: 1,
    to: 2
  };
}

test("ValidateEditableNumberRange", async () => {
  const test = new TestClass2();

  expect(await validate(test)).toHaveLength(0);

  test.attr1.from = -10;
  expect(await validate(test)).toHaveLength(1); // Less than minLimit

  test.attr1.from = 10;
  expect(await validate(test)).toHaveLength(1); // Greater than maxLimit, also greater than TO

  test.attr1.from = 3;
  expect(await validate(test)).toHaveLength(1); // Greater than TO

  test.attr1.from = 1;
  expect(await validate(test)).toHaveLength(0); // Okay

  test.attr1.to = -10;
  expect(await validate(test)).toHaveLength(1); // Less than minLimit, also less than FROM

  test.attr1.to = 10;
  expect(await validate(test)).toHaveLength(1); // Greater than maxLimit

  test.attr1.to = 1;
  expect(await validate(test)).toHaveLength(0); // Okay, equal to FROM

  test.attr1.step = 0;
  expect(await validate(test)).toHaveLength(1); // Step is 0, which is not positive

  test.attr1.step = 1000;
  expect(await validate(test)).toHaveLength(0); // Step is 1000, which is positive

  test.attr1.minLimit.value = -11;
  expect(await validate(test)).toHaveLength(1); // minLimit is less than -10

  test.attr1.minLimit.value = 0;
  expect(await validate(test)).toHaveLength(0); // Okay

  test.attr1.maxLimit.value = 11;
  expect(await validate(test)).toHaveLength(1); // maxLimit is greater than 10

  test.attr1.maxLimit.value = 10;
  expect(await validate(test)).toHaveLength(0); // Okay
});
