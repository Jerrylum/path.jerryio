import { Path, Segment } from "../core/Path";
import { GeneralConfig } from "./Config";
import { PointCalculationResult } from "../core/Calculation";
import { APP_VERSION, getAppStores } from "../core/MainApp";
import { Range } from "semver";
import { UnitOfLength } from "../core/Unit";
import { LemLibFormatV0_4 } from "./LemLibFormatV0_4";
import { PathDotJerryioFormatV0_1 } from "./PathDotJerryioFormatV0_1";
import {
  FieldImageSignatureAndOrigin,
  FieldImageOriginType,
  FieldImageBuiltInOrigin,
  FieldImageExternalOrigin,
  createExternalFieldImage,
  FieldImageLocalOrigin
} from "../core/Asset";
import { runInActionAsync } from "../core/Util";
import { when } from "mobx";
import { LemLibOdomGeneratorFormatV0_4 } from "./LemLibOdomGeneratorFormatV0_4";
import { CancellableCommand, ExecutionEventListenersContainer } from "../core/Command";

export interface Format extends ExecutionEventListenersContainer<CancellableCommand> {
  isInit: boolean;
  uid: string;

  getName(): string;

  init(): void;

  createNewInstance(): Format;

  getGeneralConfig(): GeneralConfig;

  createPath(...segments: Segment[]): Path;

  getPathPoints(path: Path): PointCalculationResult;

  recoverPathFileData(fileContent: string): PathFileData;

  exportPathFile(): string; // return file content
}

export function getAllFormats(): Format[] {
  return [
    new LemLibFormatV0_4(), //
    new LemLibOdomGeneratorFormatV0_4(),
    new PathDotJerryioFormatV0_1()
  ];
}

export interface PathFileData {
  gc: GeneralConfig;
  paths: Path[];
}

interface PathFileDataConverter {
  version: Range;
  convert: (data: Record<string, any>) => void;
}

const convertFromV0_1_0ToV0_2_0: PathFileDataConverter = {
  version: new Range("~0.1"),
  convert: (data: Record<string, any>): void => {
    // Covert old enum number to new enum ratio
    data.gc.uol = {
      1: UnitOfLength.Millimeter,
      2: UnitOfLength.Centimeter,
      3: UnitOfLength.Meter,
      4: UnitOfLength.Inch,
      5: UnitOfLength.Foot
    }[data.gc.uol as number];

    // From v0.1.0 to v0.2.0
    data.appVersion = "0.2.0";
  }
};

const convertFromV0_2_0ToV0_3_0: PathFileDataConverter = {
  version: new Range("~0.2"),
  convert: (data: Record<string, any>): void => {
    if (data.format === "LemLib v0.4.x (inch, byte-voltage)") {
      for (const path of data.paths) path.pc.maxDecelerationRate = 127;
    }

    // From v0.2.0 to v0.3.0
    data.appVersion = "0.3.0";
  }
};

const convertFromV0_3_0ToV0_4_0: PathFileDataConverter = {
  version: new Range("~0.3"),
  convert: (data: Record<string, any>): void => {
    // the field image is using the default field image

    // From v0.3.0 to v0.4.0
    data.appVersion = "0.4.0";
  }
};

const convertFromV0_4_0ToCurrentAppVersion: PathFileDataConverter = {
  version: new Range("~0.4"),
  convert: (data: Record<string, any>): void => {
    // From v0.4.0 to current app version
    data.appVersion = APP_VERSION.version;
  }
};

export function convertPathFileData(data: Record<string, any>): boolean {
  for (const { version, convert } of [
    convertFromV0_1_0ToV0_2_0,
    convertFromV0_2_0ToV0_3_0,
    convertFromV0_3_0ToV0_4_0,
    convertFromV0_4_0ToCurrentAppVersion
  ]) {
    if (version.test(data.appVersion)) {
      convert(data);
      return true;
    }
  }
  return false;
}

export async function promptFieldImage(
  signAndOrigin: FieldImageSignatureAndOrigin<FieldImageOriginType>
): Promise<boolean> {
  const { assetManager, confirmation, modals } = getAppStores();

  if (assetManager.getAssetBySignature(signAndOrigin.signature)) return true;

  if (signAndOrigin.origin instanceof FieldImageBuiltInOrigin) {
    throw new Error("Built-in field image not found.");
  } else if (signAndOrigin.origin instanceof FieldImageExternalOrigin) {
    const url = new URL(signAndOrigin.origin.location);

    await new Promise<void>(resolve => {
      confirmation.prompt({
        title: "Download External Field Image",
        description: (
          <>
            This path file recommends the use of a custom field image. Would you like to download and install it? <br />
            <br />
            Click "Yes" to download and install the image from <a href={url.toString()}>{url.origin}</a> only if you
            trust the source. <br />
            Click "No" to use the default field image instead.
            <br />
            <br />
            Name: {signAndOrigin.displayName}
          </>
        ),
        buttons: [{ label: "Yes", onClick: resolve }, { label: "No" }]
      });
    });

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

    modals.open(RequireLocalFieldImageModalSymbol);
    await when(() => modals.opening !== RequireLocalFieldImageModalSymbol);

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
