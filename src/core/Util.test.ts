import { validate } from "class-validator";
import { ValidateNumber } from "./Util";

class TestClass {
  @ValidateNumber((num) => num >= 5 && num <= 10)
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
