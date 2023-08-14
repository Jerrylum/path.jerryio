import { makeObservable, action } from "mobx";
import { getAppStores } from "./MainApp";
import { AnyControl, Control, EndControl, Path, PathTreeItem, relatedPaths } from "./Path";
import { Logger } from "./Logger";
import { enqueueInfoSnackbar } from "../app/Notice";
import { UnitConverter, UnitOfLength } from "./Unit";
import { Expose, Type, instanceToPlain, plainToClassFromExist, plainToInstance } from "class-transformer";
import { ValidateNumber, makeId, runInActionAsync } from "./Util";
import DOMPurify from "dompurify";
import { AddPath, InsertControls, InsertPaths, RemovePathTreeItems } from "./Command";
import { Equals, IsArray, Length, ArrayMinSize, ValidateNested, isObject, validate } from "class-validator";
import { APP_VERSION_STRING } from "../Version";

const logger = Logger("Clipboard");

const MIME_TYPE = `application/x-clipboard-path.jerryio.com-${APP_VERSION_STRING}`;

type ClipboardMessageType = "SYNC_DATA" | "COPY_PATHS" | "COPY_CONTROLS";

abstract class ClipboardMessage {
  abstract readonly discriminator: ClipboardMessageType;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class SyncDataMessage extends ClipboardMessage {
  @Expose()
  readonly discriminator: ClipboardMessageType = "SYNC_DATA";
}

class CopyPathsMessage extends ClipboardMessage {
  @Equals(MIME_TYPE)
  @Expose()
  readonly type: string = MIME_TYPE;
  @Equals("COPY_PATHS")
  @Expose()
  readonly discriminator: ClipboardMessageType = "COPY_PATHS";

  @Length(1, 100)
  @Expose()
  format!: string;
  @ValidateNumber(num => num > 0 && num <= 1000) // Don't use IsEnum
  @Expose()
  uol!: UnitOfLength;
  @ValidateNested()
  @ArrayMinSize(1)
  @IsArray()
  @Expose()
  @Type(() => Path)
  items!: Path[];

  constructor(); // For class-transformer
  constructor(format: string, uol: UnitOfLength, paths: Path[]);
  constructor(format?: string, uol?: UnitOfLength, paths?: Path[]) {
    super();
    if (format !== undefined && uol !== undefined && paths !== undefined) {
      this.format = format;
      this.uol = uol;
      this.items = paths;
    }
  }

  paste() {
    const { app } = getAppStores();
    const purify = DOMPurify();

    const oldUOL = this.uol;
    const newUOL = app.gc.uol;
    const uc = new UnitConverter(oldUOL, newUOL);

    for (const path of this.items) {
      // ALGO: The order of re-assigning the uid shouldn't matter
      path.uid = makeId(10);

      // SECURITY: Sanitize path names, beware of XSS attack from the clipboard
      const temp = purify.sanitize(path.name);
      path.name = temp === "" ? "Path" : temp;

      // ALGO: Link the first vector of each segment to the last vector of the previous segment
      for (let j = 1; j < path.segments.length; j++) {
        path.segments[j].first = path.segments[j - 1].last;
      }

      for (const control of path.controls) {
        control.uid = makeId(10);
        control.x = uc.fromAtoB(control.x);
        control.y = uc.fromAtoB(control.y);
      }
    }

    const interestedPath = app.interestedPath();
    const idx = interestedPath === undefined ? 0 : app.paths.indexOf(interestedPath) + 1;

    app.history.execute(`Paste ${this.items.length} paths`, new InsertPaths(app.paths, idx, this.items));
    app.setSelected(this.items.slice());

    return true;
  }
}

class CopyControlsMessage extends ClipboardMessage {
  @Equals(MIME_TYPE)
  @Expose()
  readonly type: string = MIME_TYPE;
  @Equals("COPY_CONTROLS")
  @Expose()
  readonly discriminator: ClipboardMessageType = "COPY_CONTROLS";

  @ValidateNumber(num => num > 0 && num <= 1000) // Don't use IsEnum
  @Expose()
  uol!: UnitOfLength;
  @ValidateNested()
  @ArrayMinSize(1)
  @IsArray()
  @Expose()
  @Type(() => Control, {
    discriminator: {
      property: "__type",
      subTypes: [
        { value: EndControl, name: "end-point" },
        { value: Control, name: "control" }
      ]
    },
    keepDiscriminatorProperty: true
  })
  items!: AnyControl[];

  constructor(); // For class-transformer
  constructor(uol: UnitOfLength, controls: AnyControl[]);
  constructor(uol?: UnitOfLength, controls?: AnyControl[]) {
    super();
    if (uol !== undefined && controls !== undefined) {
      this.uol = uol;
      this.items = controls;
    }
  }

  paste() {
    const { app } = getAppStores();

    const oldUOL = this.uol;
    const newUOL = app.gc.uol;
    const uc = new UnitConverter(oldUOL, newUOL);

    for (const control of this.items) {
      control.uid = makeId(10);
      control.x = uc.fromAtoB(control.x);
      control.y = uc.fromAtoB(control.y);
    }

    if (app.paths.length === 0) {
      const newPath = app.format.createPath();
      app.history.execute(`Add path ${newPath.uid}`, new AddPath(app.paths, newPath));
      app.addExpanded(newPath);
    }

    const entities = app.allEntities;
    const selected = app.selectedEntityIds;
    let idx: number;
    if (selected.length === 0) {
      idx = entities.length; // insert at the end
    } else {
      // ALGO: If findIndex returns -1 for unknown reason, idx = 0 and the command is invalid
      idx = entities.findIndex(e => e.uid === selected[selected.length - 1]) + 1;
    }

    app.history.execute(`Paste ${this.items.length} controls`, new InsertControls(entities, idx, this.items));
    app.setSelected(this.items.slice());

    return true;
  }
}

function createMessageFromData(data: Record<string, any>): CopyPathsMessage | CopyControlsMessage | undefined {
  // ALGO: The return value maybe untrusted depending on the data
  const { app } = getAppStores();
  if (data["discriminator"] === "COPY_PATHS") {
    const message = plainToInstance(
      CopyPathsMessage,
      { ...data, items: [] },
      { excludeExtraneousValues: true, exposeDefaultValues: true }
    );

    if (message.format !== app.format.getName()) {
      enqueueInfoSnackbar(logger, "Pasting data in other format is not supported");
      return undefined;
    }

    for (const pathRaw of data.items) {
      const path = app.format.createPath();
      const pathPC = path.pc;
      plainToClassFromExist(path, pathRaw, { excludeExtraneousValues: true, exposeDefaultValues: true });
      path.pc = plainToClassFromExist(pathPC, pathRaw.pc, { exposeDefaultValues: true });

      message.items.push(path);
    }

    return message;
  } else if (data["discriminator"] === "COPY_CONTROLS") {
    return plainToInstance(CopyControlsMessage, data, {
      excludeExtraneousValues: true,
      exposeDefaultValues: true
    });
  } else {
    return undefined;
  }
}

export class AppClipboard {
  private broadcastChannel: BroadcastChannel | undefined;

  private data: Record<string, any> | undefined;

  public cut(): PathTreeItem[] | undefined {
    const { app } = getAppStores();

    const items = this.copy();
    if (items !== undefined) {
      app.history.execute(`Cut ${items.length} path tree items`, new RemovePathTreeItems(app.paths, items));
    }

    return items;
  }

  public copy(): PathTreeItem[] | undefined {
    const { app } = getAppStores();

    const selected = app.selectedEntities;
    if (selected.length === 0) return;

    const isCopyPaths = selected[0] instanceof Path;
    if (selected.some(e => e instanceof Path !== isCopyPaths)) {
      const related = relatedPaths(app.paths, selected);
      if (related.length === 1) {
        // Trying to copy controls and the path they belong to
        app.setSelected([related[0]]);
        return this.copy();
      } else {
        // Trying to copy controls in multiple paths or even worse
        enqueueInfoSnackbar(logger, "Copying controls and paths together is not supported");
        return;
      }
    }

    let message: CopyPathsMessage | CopyControlsMessage;
    if (isCopyPaths) {
      message = new CopyPathsMessage(app.format.getName(), app.gc.uol, selected as Path[]);
    } else {
      message = new CopyControlsMessage(app.gc.uol, selected as AnyControl[]);
    }
    this.data = instanceToPlain(message);

    this.broadcastChannel?.postMessage(this.data);

    navigator.clipboard?.writeText?.(JSON.stringify(this.data));

    return message.items;
  }

  public async paste(untrustedSystemClipboardDataInString: string | undefined): Promise<boolean> {
    let message: CopyPathsMessage | CopyControlsMessage | undefined;
    if (untrustedSystemClipboardDataInString === undefined) {
      untrustedSystemClipboardDataInString = await new Promise(resolve => {
        if (navigator.clipboard?.readText === undefined) resolve(undefined);
        else
          navigator.clipboard.readText().then(
            text => resolve(text),
            () => resolve(undefined)
          );
      });
    }

    if (untrustedSystemClipboardDataInString === undefined) {
      if (this.data === undefined) return false;

      message = createMessageFromData(this.data);
    } else {
      let untrustedData: Record<string, any>;
      try {
        untrustedData = JSON.parse(untrustedSystemClipboardDataInString);
      } catch (e) {
        return false;
      }

      if (untrustedData["type"] !== MIME_TYPE) return false;

      const untrustedMessage = createMessageFromData(untrustedData);
      if (untrustedMessage === undefined) return false;

      const errors = await validate(untrustedMessage);
      if (errors.length > 0) {
        errors.forEach(e => logger.error("Validation errors", e.constraints, `in ${e.property}`));
        enqueueInfoSnackbar(logger, "Pasting data failed due to validation errors");
        return false;
      }

      const trustedData = untrustedData;
      const trustedMessage = untrustedMessage;

      message = trustedMessage;
      this.data = trustedData;

      this.broadcastChannel?.postMessage(trustedData);
    }

    return runInActionAsync(() => message?.paste() ?? false);
  }

  get hasData() {
    return this.data !== undefined;
  }

  private createBroadcastChannel() {
    if (this.broadcastChannel !== undefined) return undefined;

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("versioning");
      channel.onmessage = event => {
        if (isObject(event.data) === false) return;

        const data = event.data as Record<string, any>;
        if (data["discriminator"] === "SYNC_DATA") {
          if (this.data !== undefined) {
            channel.postMessage(this.data);
          }
        } else if (data["discriminator"] === "COPY_PATHS" || data["discriminator"] === "COPY_CONTROLS") {
          this.data = event.data;
        }
      };
      return channel;
    } else {
      return undefined;
    }
  }

  constructor() {
    makeObservable(this, { cut: action, copy: action, paste: action });

    // Read and write clipboard data to session storage, so that it is preserved when the page is refreshed
    const clipboardDataInSessionStorage = window.sessionStorage.getItem("clipboard");
    if (clipboardDataInSessionStorage !== null) {
      this.data = JSON.parse(clipboardDataInSessionStorage);
    }

    window.addEventListener("beforeunload", () => {
      if (this.data !== undefined) {
        window.sessionStorage.setItem("clipboard", JSON.stringify(this.data));
      }
    });

    // Create broadcast channel to sync clipboard data between tabs
    this.broadcastChannel = this.createBroadcastChannel();
    this.broadcastChannel?.postMessage({ discriminator: "SYNC_DATA" });
  }
}
