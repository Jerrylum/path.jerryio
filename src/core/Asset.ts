import "reflect-metadata";
import { Exclude, Expose, Type, instanceToPlain, plainToInstance } from "class-transformer";
import {
  IsObject,
  IsString,
  MinLength,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
  registerDecorator
} from "class-validator";
import { Hash } from "fast-sha256";
import { makeAutoObservable, makeObservable, observable } from "mobx";
import { ValidateNumber, hex, makeId, TextEncoder } from "./Util";
import localforage from "localforage";
import { Dimension } from "./CoordinateSystem";

export const DEFAULT_ACCEPT_FILE_EXT = [".png", ".jpg", ".jpeg", ".gif"] as const;

export enum FieldImageOriginType {
  BuiltIn = "built-in",
  External = "external",
  Local = "local"
}

export function getFieldImageOriginTypeDescription(type: FieldImageOriginType): string {
  switch (type) {
    case FieldImageOriginType.BuiltIn:
      return "Built-in";
    case FieldImageOriginType.External:
      return "External";
    case FieldImageOriginType.Local:
      return "Local";
    default:
      return "";
  }
}

export type FieldImageOriginClass<TType = FieldImageOriginType> = TType extends FieldImageOriginType.BuiltIn
  ? FieldImageBuiltInOrigin
  : TType extends FieldImageOriginType.External
  ? FieldImageExternalOrigin
  : TType extends FieldImageOriginType.Local
  ? FieldImageLocalOrigin
  : never;

export class FieldImageBuiltInOrigin {
  @Exclude()
  readonly discriminator = FieldImageOriginType.BuiltIn;

  constructor() {
    makeAutoObservable(this);
  }
}

export class FieldImageExternalOrigin {
  @Exclude()
  readonly discriminator = FieldImageOriginType.External;

  @ValidateNumber(num => num >= 100)
  @Expose()
  public heightInMM: number; // in MM

  @IsString()
  @MinLength(1)
  @ValidateFieldImageURL("location" in globalThis ? globalThis.location.protocol === "https:" : false)
  @Expose()
  public location: string;

  constructor(heightInMM: number, location: string) {
    makeAutoObservable(this);
    this.heightInMM = heightInMM;
    this.location = location;
  }
}

export class FieldImageLocalOrigin {
  @Exclude()
  readonly discriminator = FieldImageOriginType.Local;

  @ValidateNumber(num => num >= 100)
  @Expose()
  public heightInMM: number; // in MM

  constructor(heightInMM: number) {
    makeAutoObservable(this);
    this.heightInMM = heightInMM;
  }
}

export class FieldImageSignatureAndOrigin<TOrigin extends FieldImageOriginType> {
  @Expose()
  @IsString()
  @MinLength(1)
  public displayName: string;

  @Expose()
  @IsString()
  @MinLength(1)
  @ValidateSignature()
  public signature: string;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => FieldImageBuiltInOrigin, {
    discriminator: {
      property: "__type",
      subTypes: [
        { value: FieldImageBuiltInOrigin, name: FieldImageOriginType.BuiltIn },
        { value: FieldImageExternalOrigin, name: FieldImageOriginType.External },
        { value: FieldImageLocalOrigin, name: FieldImageOriginType.Local }
      ]
    },
    keepDiscriminatorProperty: true
  })
  public origin: FieldImageOriginClass<TOrigin>;

  constructor(displayName: string, signature: string, origin: FieldImageOriginClass<TOrigin>) {
    makeAutoObservable(this);
    this.displayName = displayName;
    this.signature = signature;
    this.origin = origin;
  }
}

export class FieldImageAsset<TOrigin extends FieldImageOriginType> {
  readonly type: TOrigin;

  public displayName: string;
  public heightInMM: number; // in MM
  public location: string;
  public signature: string;

  constructor(type: TOrigin, displayName: string, heightInMM: number, location: string, signature: string) {
    makeObservable(this, {
      displayName: observable,
      heightInMM: observable,
      location: observable,
      signature: observable
    });

    // ALGO: Any code make to this point assume the image is downloaded

    this.type = type;
    this.displayName = displayName;
    this.heightInMM = heightInMM;
    this.location = location;
    this.signature = signature;
  }

  async imageSource() {
    return this.location;
  }

  async getDimension(): Promise<Dimension> {
    const img = new Image();
    img.src = this.location;
    await img.decode();
    return { width: img.width, height: img.height };
  }

  getOrigin(): FieldImageOriginClass<TOrigin>;
  getOrigin() {
    switch (this.type) {
      case FieldImageOriginType.BuiltIn:
        return new FieldImageBuiltInOrigin();
      case FieldImageOriginType.External:
        return new FieldImageExternalOrigin(this.heightInMM, this.location);
      case FieldImageOriginType.Local:
        return new FieldImageLocalOrigin(this.heightInMM);
      default:
        throw new Error("Invalid origin type"); // should never happen
    }
  }

  getSignatureAndOrigin(): FieldImageSignatureAndOrigin<TOrigin> {
    return new FieldImageSignatureAndOrigin(this.displayName, this.signature, this.getOrigin());
  }

  isOriginType<TCompare extends FieldImageOriginType>(compare: TCompare): this is FieldImageAsset<TCompare> {
    return this.type === (compare as unknown);
  }
}

export class FieldImageLocalAsset extends FieldImageAsset<FieldImageOriginType.Local> {
  @Exclude()
  public data: Blob | null | undefined = undefined;
  @Exclude()
  public objectUrl: string = "";

  constructor(displayName: string, heightInMM: number, storageKey: string, signature: string) {
    super(FieldImageOriginType.Local, displayName, heightInMM, storageKey, signature);

    makeObservable(this, {
      data: observable
    });
  }

  async imageSource() {
    if (this.objectUrl === "") {
      this.data = await localforage.getItem<Blob | null>(this.location);
      this.objectUrl = this.data ? URL.createObjectURL(this.data) : "";
    }

    return this.objectUrl;
  }

  removeFromStorage() {
    localforage.removeItem(this.location);
  }
}

export function createBuiltInFieldImage(
  displayName: string,
  heightInMM: number,
  location: string,
  signature: string = displayName
): FieldImageAsset<FieldImageOriginType.BuiltIn> {
  // displayName is the signature
  return new FieldImageAsset(FieldImageOriginType.BuiltIn, displayName, heightInMM, location, signature);
}

export async function createExternalFieldImage(
  displayName: string,
  heightInMM: number,
  location: string
): Promise<FieldImageAsset<FieldImageOriginType.External> | undefined> {
  try {
    // const response = await fetch(location, { cache: "no-cache" });
    // if (response.ok === false) return undefined;
    // const data = new Uint8Array(await response.arrayBuffer());

    const hash = new Hash();
    hash.update(new TextEncoder().encode(`${heightInMM} ${location}`));
    const calculatedSignature = hex(hash.digest());

    return new FieldImageAsset(FieldImageOriginType.External, displayName, heightInMM, location, calculatedSignature);
  } catch (e) {
    return undefined;
  }
}

export async function createLocalFieldImage(
  displayName: string,
  heightInMM: number,
  data: Blob
): Promise<FieldImageLocalAsset | undefined> {
  try {
    const storageKey = makeId(10);
    await localforage.setItem(storageKey, data);

    const hash = new Hash();
    hash.update(new TextEncoder().encode(`${heightInMM}`));
    hash.update(new Uint8Array(await data.arrayBuffer()));
    const calculatedSignature = hex(hash.digest());

    return new FieldImageLocalAsset(displayName, heightInMM, storageKey, calculatedSignature);
  } catch (e) {
    return undefined;
  }
}

export function ValidateFieldImageURL(
  enforceSecure: boolean = false,
  acceptFileExt: string[] = DEFAULT_ACCEPT_FILE_EXT.slice(),
  validationOptions?: ValidationOptions
) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      name: "ValidateFieldImageURL",
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [enforceSecure, acceptFileExt],
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const enforceSecure: boolean = args.constraints[0];
          const acceptFileExt: string[] = args.constraints[1];

          if (typeof value !== "string") return false;

          const [, feedback] = validateAndPurifyFieldImageURL(value, enforceSecure, acceptFileExt);

          return feedback === null;
        },
        defaultMessage(args: ValidationArguments) {
          return `The ${args.property} must be a valid URL`;
        }
      }
    });
  };
}

export function ValidateSignature(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      name: "ValidateSignature",
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const obj = args.object;
          if (obj instanceof FieldImageSignatureAndOrigin) {
            const origin = obj.origin;

            if (origin instanceof FieldImageBuiltInOrigin) return true;
            if (origin instanceof FieldImageExternalOrigin) {
              const hash = new Hash();
              hash.update(new TextEncoder().encode(`${origin.heightInMM} ${origin.location}`));
              return hex(hash.digest()) === obj.signature;
            } else {
              return true;
            }
          } else {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `The ${args.property} must be a valid signature`;
        }
      }
    });
  };
}

/**
 * Validate and purify a field image URL
 *
 * @param untrusted The untrusted URL
 * @param enforceSecure Whether the URL must be HTTPS
 * @param acceptFileExt The accepted file extensions, including the dot. For example, [".png", ".jpg", ".jpeg", ".gif"].
 * Passing an empty array will accept all file extensions.
 * @returns [trusted, feedback | null] if valid, [null, error] if invalid
 */
export function validateAndPurifyFieldImageURL(
  untrusted: string,
  enforceSecure: boolean = false,
  acceptFileExt: string[] = DEFAULT_ACCEPT_FILE_EXT.slice()
): [URL, null] | [URL, string] | [null, string] {
  try {
    const untrustedUrl = new URL(untrusted); // throw TypeError if invalid

    if (untrustedUrl.protocol !== "http:" && untrustedUrl.protocol !== "https:")
      return [null, "The protocol must be HTTP or HTTPS"];

    if (enforceSecure && untrustedUrl.protocol !== "https:") return [null, "The URL must be HTTPS"];

    if (acceptFileExt.length > 0) {
      if (acceptFileExt.some(ext => untrustedUrl.pathname.endsWith(ext)) === false)
        return [null, `The URL must have one of the following extensions: ${acceptFileExt.join(", ")}`];
    }

    ///////////////////////////////////////////////////////////
    // The URL is valid at this point, but we need to purify it
    ///////////////////////////////////////////////////////////

    let feedback: string | null = null;

    if (untrustedUrl.search !== "") feedback = "The query string of the URL will be removed";
    untrustedUrl.search = "";

    const trustedUrl = untrustedUrl;

    return [trustedUrl, feedback];
  } catch (e) {
    return [null, "Invalid URL"];
  }
}

export class AssetManager {
  private userAssets: FieldImageAsset<FieldImageOriginType>[] = [];

  public requiringLocalFieldImage: {
    requireSignAndOrigin: FieldImageSignatureAndOrigin<FieldImageOriginType.Local>;
    answer: FieldImageLocalAsset | null | undefined;
  } | null = null;

  constructor() {
    makeAutoObservable(this);

    this.loadAssets();
    window.addEventListener("storage", () => this.loadAssets());
  }

  loadAssets() {
    // ALGO: Assume the assets are valid

    const assets: Record<string, unknown>[] = JSON.parse(localStorage.getItem("assets") ?? "[]");
    this.userAssets = assets.map(asset =>
      plainToInstance(asset["type"] === FieldImageOriginType.Local ? FieldImageLocalAsset : FieldImageAsset, asset)
    );
  }

  saveAssets() {
    const assetsInObj = instanceToPlain(this.userAssets);
    localStorage.setItem("assets", JSON.stringify(assetsInObj));
  }

  addAsset(asset: FieldImageAsset<FieldImageOriginType.External | FieldImageOriginType.Local>) {
    this.userAssets.push(asset);
    this.saveAssets();
  }

  removeAsset(asset: FieldImageAsset<FieldImageOriginType.External | FieldImageOriginType.Local>) {
    if (asset instanceof FieldImageLocalAsset) asset.removeFromStorage();

    const index = this.userAssets.indexOf(asset);
    if (index !== -1) {
      this.userAssets.splice(index, 1);
      this.saveAssets();
    }
  }

  getAssetBySignature(signature: string): FieldImageAsset<FieldImageOriginType> | undefined {
    return this.assets.find(asset => asset.signature === signature);
  }

  get assets(): Readonly<FieldImageAsset<FieldImageOriginType>[]> {
    return [...builtInAssets, ...this.userAssets];
  }
}

const builtInAssets: FieldImageAsset<FieldImageOriginType>[] = [
  // 3683 = 145*2.54*10 ~= 3676.528, the size of the field perimeter in Fusion 360
  createBuiltInFieldImage(
    "V5RC 2025 - High Stakes",
    3690,
    "/precache/V5RC-HighStakes-H2H-TileColor66_71-2000x2000.png"
  ),
  createBuiltInFieldImage(
    "V5RC 2025 - High Stakes (Skills)",
    3690,
    "/static/V5RC-HighStakes-Skills-TileColor66_71-2000x2000.png"
  ),
  createBuiltInFieldImage(
    "VURC 2025 - High Stakes",
    3690,
    "/static/VURC-HighStakes-H2H-TileColor66_71-2000x2000.png" //
  ),
  createBuiltInFieldImage(
    "VURC 2025 - High Stakes (Skills)",
    3690,
    "/static/VURC-HighStakes-Skills-TileColor66_71-2000x2000.png"
  ),
  createBuiltInFieldImage(
    "V5RC 2024 - Over Under",
    3690,
    "/static/V5RC-OverUnder-H2H-TileColor66_71-2000x2000.png",
    "VRC 2024 - Over Under"
  ),
  createBuiltInFieldImage(
    "V5RC 2024 - Over Under (Skills)",
    3690,
    "/static/V5RC-OverUnder-Skills-TileColor66_71-2000x2000.png",
    "VRC 2024 - Over Under (Skill)"
  ),
  createBuiltInFieldImage(
    "VURC 2024 - Over Under",
    3690,
    "/static/VURC-OverUnder-H2H-TileColor66_71-2000x2000.png",
    "VRC 2024 - Over Under (VEX U)"
  ),
  createBuiltInFieldImage(
    "V5RC Field Perimeter",
    3690,
    "/precache/V5RC-FieldPerimeter-Plain-TileColor66_71-2000x2000.png",
    "VRC Field Perimeter"
  ),
  createBuiltInFieldImage("VIQC 2025 - Rapid Relay", 1920, "/static/VIQC-RapidRelay-8ft6ft-2000x1517.png"),
  createBuiltInFieldImage("VIQC 2024 - Full Volume", 1920, "/static/VIQC-FullVolume-8ft6ft-2000x1517.png"),
  createBuiltInFieldImage("VIQC Field Perimeter 8ft×6ft", 1920, "/static/VIQC-FieldPerimeter-8ft6ft-2000x1517.png")
];

export function getDefaultBuiltInFieldImage(): FieldImageAsset<FieldImageOriginType> {
  return builtInAssets[0];
}
