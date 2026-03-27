import { when } from "mobx";
import {
  FieldImageSignatureAndOrigin,
  FieldImageOriginType,
  FieldImageBuiltInOrigin,
  FieldImageExternalOrigin,
  createExternalFieldImage,
  FieldImageLocalOrigin
} from "./Asset";
import { getAppStores } from "./MainApp";
import { runInActionAsync } from "./Util";

export async function promptFieldImage(
  signAndOrigin: FieldImageSignatureAndOrigin<FieldImageOriginType>
): Promise<boolean> {
  const { assetManager, confirmation, ui } = getAppStores();

  if (assetManager.getAssetBySignature(signAndOrigin.signature)) return true;

  if (signAndOrigin.origin instanceof FieldImageBuiltInOrigin) {
    throw new Error("Built-in field image not found.");
  } else if (signAndOrigin.origin instanceof FieldImageExternalOrigin) {
    const url = new URL(signAndOrigin.origin.location);

    const answer = await new Promise<boolean>(resolve => {
      confirmation.prompt({
        title: "Download External Field Image",
        description: (
          <>
            This path file recommends the use of a custom field image. Would you like to download and install it?
            <br />
            <br />
            Click "Yes" to download and install the image from <a href={url.toString()}>{url.origin}</a> only if you
            trust the source.
            <br />
            Click "No" to use the default field image instead.
            <br />
            <br />
            Name: {signAndOrigin.displayName}
          </>
        ),
        buttons: [
          { label: "Yes", onClick: () => resolve(true) },
          { label: "No", onClick: () => resolve(false) }
        ]
      });
    });

    if (answer === false) return false;

    const asset = await createExternalFieldImage(
      signAndOrigin.displayName,
      signAndOrigin.origin.heightInMM,
      signAndOrigin.origin.location
    );
    if (asset === undefined) throw new Error("Unable to create the field image.");

    assetManager.addAsset(asset);

    return true;
  } else if (signAndOrigin.origin instanceof FieldImageLocalOrigin) {
    assetManager.requiringLocalFieldImage = {
      requireSignAndOrigin: signAndOrigin,
      answer: undefined
    };

    ui.openModal(RequireLocalFieldImageModalSymbol);
    await when(() => ui.openingModal !== RequireLocalFieldImageModalSymbol);

    const answer = assetManager.requiringLocalFieldImage.answer;

    if (answer === undefined) throw new Error("The operation is cancelled by the user.");

    await runInActionAsync(() => {
      assetManager.requiringLocalFieldImage = null;
      if (answer !== null) assetManager.addAsset(answer);
    });

    return answer !== null;
  } else {
    throw new Error("Unknown field image origin type.");
  }
}

export const RequireLocalFieldImageModalSymbol = Symbol("RequireLocalFieldImageModal");
