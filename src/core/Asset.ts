import { Exclude, Expose, Type, instanceToPlain, plainToInstance } from "class-transformer";
import { IsString, MinLength } from "class-validator";
import { Hash } from "fast-sha256";
import { makeAutoObservable, makeObservable, observable } from "mobx";
import { ValidateNumber, hex, makeId } from "./Util";
import localforage from "localforage";
import builtInFieldImage2024 from "../static/field2024.png";
import builtInFieldPerimeter from "../static/field-perimeter.png";

export enum FieldImageAssetType {
  OfficialPreCached = "official-pre-cached",
  OfficialDownload = "official-download",
  ExternalDownload = "external-download",
  Local = "local"
}

export enum FieldImageOriginType {
  BuiltIn = "built-in",
  External = "external",
  Local = "local"
}

type FieldImageOrigin = FieldImageBuiltInOrigin | FieldImageExternalOrigin | FieldImageLocalOrigin;

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

  @ValidateNumber(num => num > 1)
  @Expose()
  public heightInMM: number; // in MM

  @IsString()
  @MinLength(1)
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

  @ValidateNumber(num => num >= 1)
  @Expose()
  public heightInMM: number; // in MM

  constructor(heightInMM: number) {
    makeAutoObservable(this);
    this.heightInMM = heightInMM;
  }
}

export class FieldImageSignatureAndOrigin {
  @Expose()
  @IsString()
  @MinLength(1)
  public displayName: string;

  @Expose()
  @IsString()
  @MinLength(1)
  public signature: string; // heightInMM + image data

  @Expose()
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
  public origin: FieldImageOrigin;

  constructor(displayName: string, signature: string, origin: FieldImageOrigin) {
    makeAutoObservable(this);
    this.displayName = displayName;
    this.signature = signature;
    this.origin = origin;
  }
}

export class FieldImageAsset {
  readonly type: FieldImageOriginType;

  public displayName: string;
  public heightInMM: number; // in MM
  public location: string;
  public signature: string;

  constructor(
    type: FieldImageOriginType,
    displayName: string,
    heightInMM: number,
    location: string,
    signature: string
  ) {
    // makeAutoObservable(this);
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

  imageSource(): string {
    return this.location;
  }

  getOrigin(): FieldImageOrigin {
    switch (this.type) {
      case FieldImageOriginType.BuiltIn:
        return new FieldImageBuiltInOrigin();
      case FieldImageOriginType.External:
        return new FieldImageExternalOrigin(this.heightInMM, this.location);
      case FieldImageOriginType.Local:
        return new FieldImageLocalOrigin(this.heightInMM);
    }
  }

  getSignatureAndOrigin(): FieldImageSignatureAndOrigin {
    return new FieldImageSignatureAndOrigin(this.displayName, this.signature, this.getOrigin());
  }
}

export class FieldImageLocalAsset extends FieldImageAsset {
  public data: Blob | null | undefined = null;

  constructor(displayName: string, heightInMM: number, location: string, signature: string) {
    super(FieldImageOriginType.Local, displayName, heightInMM, location, signature);

    makeObservable(this, {
      data: observable
    });

    localforage.getItem<Blob | null>(this.location).then(data => (this.data = data));
  }

  imageSource(): string {
    if (this.data === undefined) {
      this.data = null;
      localforage.getItem<Blob | null>(this.location).then(data => (this.data = data));
    }
    return this.data ? URL.createObjectURL(this.data) : "";
  }
}

export function createBuiltInFieldImage(displayName: string, heightInMM: number, location: string): FieldImageAsset {
  // displayName is the signature
  return new FieldImageAsset(FieldImageOriginType.BuiltIn, displayName, heightInMM, location, displayName);
}

export async function createExternalFieldImage(
  displayName: string,
  heightInMM: number,
  location: string
): Promise<FieldImageAsset | undefined> {
  try {
    const response = await fetch(location, { cache: "no-cache" });
    if (response.ok === false) return undefined;
    const data = new Uint8Array(await response.arrayBuffer());

    const hash = new Hash();
    hash.update(new TextEncoder().encode(`${heightInMM}`));
    hash.update(data);
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

export class AssetManager {
  private userAssets: FieldImageAsset[] = [];

  constructor() {
    makeAutoObservable(this);

    this.loadAssets();
    window.addEventListener("storage", () => this.loadAssets());
  }

  loadAssets() {
    const assets: unknown[] = JSON.parse(localStorage.getItem("assets") ?? "[]");
    this.userAssets = plainToInstance(FieldImageAsset, assets, { excludeExtraneousValues: true });
  }

  saveAssets() {
    const assetsInObj = instanceToPlain(this.userAssets, { excludeExtraneousValues: true });
    localStorage.setItem("assets", JSON.stringify(assetsInObj));
  }

  addAsset(asset: FieldImageAsset) {
    this.userAssets.push(asset);
    this.saveAssets();
  }

  removeAsset(asset: FieldImageAsset) {
    const index = this.userAssets.indexOf(asset);
    if (index !== -1) {
      this.userAssets.splice(index, 1);
      this.saveAssets();
    }
  }

  getAssetBySignature(signature: string): FieldImageAsset | undefined {
    return this.assets.find(asset => asset.signature === signature);
  }

  get assets(): Readonly<FieldImageAsset[]> {
    return [...builtInAssets, ...this.userAssets];
  }
}

const builtInAssets: FieldImageAsset[] = [
  // 3683 = 145*2.54*10 ~= 3676.528, the size of the field perimeter in Fusion 360
  createBuiltInFieldImage("VRC 2024 - Over Under", 3683, builtInFieldImage2024),
  createBuiltInFieldImage("VRC Field Perimeter", 3683, builtInFieldPerimeter)
];

export function getDefaultBuiltInFieldImage(): FieldImageAsset {
  return builtInAssets[0];
}
