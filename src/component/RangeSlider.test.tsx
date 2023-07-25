import { Expose } from "class-transformer";
import { ValidateNumberRange, NumberRange } from "./RangeSlider";
import { validate } from "class-validator";

class TestClass {
  @ValidateNumberRange(-10, 10)
  @Expose()
  attr1: NumberRange = {
    minLimit: { value: -9, label: "0" },
    maxLimit: { value: 9, label: "5" },
    step: 1,
    from: 1,
    to: 2
  };
}

test("ValidateNumberRange", async () => {
  const test = new TestClass();

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
