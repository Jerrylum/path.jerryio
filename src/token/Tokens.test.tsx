import { Tokens } from "./Tokens";

test("Test 1", () => {
  expect(true).toBe(true);

  Tokens.Zero.parse(new Tokens.CodePointBuffer("0"));
});
