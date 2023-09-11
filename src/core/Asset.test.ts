import { validate } from "class-validator";
import {
  FieldImageBuiltInOrigin,
  FieldImageLocalAsset,
  FieldImageLocalOrigin,
  FieldImageOriginType,
  FieldImageSignatureAndOrigin,
  createExternalFieldImage,
  createLocalFieldImage
} from "./Asset";

test("Asset validation test", async () => {
  const signAndOrigin = new FieldImageSignatureAndOrigin("name123", "name123", new FieldImageBuiltInOrigin());

  expect(await validate(signAndOrigin)).toHaveLength(0);

  signAndOrigin.signature = "anything else";

  expect(await validate(signAndOrigin)).toHaveLength(1);

  const signAndOrigin2 = (
    await createExternalFieldImage("name123", 100, "http://example.com/any.png")
  )?.getSignatureAndOrigin()!;

  expect(await validate(signAndOrigin2)).toHaveLength(0);

  signAndOrigin2.displayName = "";

  expect(await validate(signAndOrigin2)).toHaveLength(1);

  signAndOrigin2.signature = "anything else";

  expect(await validate(signAndOrigin2)).toHaveLength(2);

  signAndOrigin2.origin.heightInMM = 99;

  expect(await validate(signAndOrigin2)).toHaveLength(3);

  signAndOrigin2.origin.heightInMM = 100;
  signAndOrigin2.origin.location = "anywhere";

  expect(await validate(signAndOrigin2)).toHaveLength(3);

  signAndOrigin2.origin.location = "http://example.com/any.pn";

  expect(await validate(signAndOrigin2)).toHaveLength(3);

  signAndOrigin2.origin.location = "httpp://example.com/any.png";

  expect(await validate(signAndOrigin2)).toHaveLength(3);

  const signAndOrigin3 = new FieldImageSignatureAndOrigin(
    "name123",
    "sign",
    new FieldImageLocalOrigin(100)
  ) as FieldImageSignatureAndOrigin<FieldImageOriginType.Local>;

  expect(await validate(signAndOrigin3)).toHaveLength(0);

  signAndOrigin3.displayName = "";

  expect(await validate(signAndOrigin3)).toHaveLength(1);

  signAndOrigin3.signature = "";

  expect(await validate(signAndOrigin3)).toHaveLength(2);

  signAndOrigin3.origin.heightInMM = 99;

  expect(await validate(signAndOrigin3)).toHaveLength(3);
});
