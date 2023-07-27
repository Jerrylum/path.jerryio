import { makeObservable, action } from "mobx";
import { getAppStores } from "./MainApp";
import { Control, EndControl, Path, PathTreeItem, SegmentControls } from "./Path";
import { Logger } from "./Logger";
import { enqueueInfoSnackbar } from "../app/Notice";
import { UnitConverter, UnitOfLength } from "./Unit";
import {
  ClassConstructor,
  Expose,
  Type,
  instanceToPlain,
  plainToClassFromExist,
  plainToInstance
} from "class-transformer";
import { ValidateNumber, makeId, runInActionAsync } from "./Util";
import DOMPurify from "dompurify";
import { AddPath, InsertControls, InsertPaths, RemovePathTreeItems } from "./Command";
import { IsObject, Length, ValidateNested, isObject, validate } from "class-validator";

const logger = Logger("Clipboard");

type ClipboardMessageType = "SYNC_DATA" | "COPY_PATHS" | "COPY_CONTROLS";

abstract class ClipboardMessage {
  abstract readonly discriminator: ClipboardMessageType;
}

class SyncDataMessage extends ClipboardMessage {
  @Expose()
  readonly discriminator: ClipboardMessageType = "SYNC_DATA";
}

class CopyPathsMessage extends ClipboardMessage {
  @Expose()
  readonly discriminator: ClipboardMessageType = "COPY_PATHS";

  @Length(1, 100)
  @Expose()
  format!: string;
  @ValidateNumber(num => num > 0 && num <= 1000) // Don't use IsEnum
  @Expose()
  uol!: UnitOfLength;
  @ValidateNested()
  @IsObject()
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

    if (this.format !== app.format.getName()) {
      enqueueInfoSnackbar(logger, "Pasting data in other format is not supported");
      return false;
    }

    const paths: Path[] = [];
    for (const pathRaw of this.items) {
      const path = app.format.createPath();
      const pathPC = path.pc;
      plainToClassFromExist(path, pathRaw, { excludeExtraneousValues: true, exposeDefaultValues: true });
      path.pc = plainToClassFromExist(pathPC, pathRaw.pc, {
        excludeExtraneousValues: true,
        exposeDefaultValues: true
      });
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
      paths.push(path);
    }

    const interestedPath = app.interestedPath();
    const idx = interestedPath === undefined ? 0 : app.paths.indexOf(interestedPath) + 1;

    app.history.execute(`Paste ${paths.length} paths`, new InsertPaths(app.paths, idx, paths));
    app.setSelected(paths.slice());

    return true;
  }
}

class CopyControlsMessage extends ClipboardMessage {
  @Expose()
  readonly discriminator: ClipboardMessageType = "COPY_CONTROLS";

  @Length(1, 100)
  @Expose()
  format!: string;
  @ValidateNumber(num => num > 0 && num <= 1000) // Don't use IsEnum
  @Expose()
  uol!: UnitOfLength;
  @ValidateNested()
  @IsObject()
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
  items!: (Control | EndControl)[];

  constructor(); // For class-transformer
  constructor(format: string, uol: UnitOfLength, controls: (Control | EndControl)[]);
  constructor(format?: string, uol?: UnitOfLength, controls?: (Control | EndControl)[]) {
    super();
    if (format !== undefined && uol !== undefined && controls !== undefined) {
      this.format = format;
      this.uol = uol;
      this.items = controls;
    }
  }

  paste() {
    const { app } = getAppStores();

    const oldUOL = this.uol;
    const newUOL = app.gc.uol;
    const uc = new UnitConverter(oldUOL, newUOL);

    const controls: (Control | EndControl)[] = [];
    for (const raw of this.items) {
      const control = plainToInstance("heading" in raw ? EndControl : Control, raw);
      control.uid = makeId(10);
      control.x = uc.fromAtoB(control.x);
      control.y = uc.fromAtoB(control.y);
      controls.push(control);
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

    app.history.execute(`Paste ${controls.length} controls`, new InsertControls(entities, idx, controls));
    app.setSelected(controls.slice());

    return true;
  }
}

export class AppClipboard {
  private broadcastChannel: BroadcastChannel | undefined;

  private rawMessage: Record<string, any> | undefined;

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
      // TODO: better support
      enqueueInfoSnackbar(logger, "Copying controls and paths together is not supported");
      return;
    }

    let message: CopyPathsMessage | CopyControlsMessage;
    if (isCopyPaths) {
      message = new CopyPathsMessage(app.format.getName(), app.gc.uol, selected as Path[]);
    } else {
      message = new CopyControlsMessage(app.format.getName(), app.gc.uol, selected as (Control | EndControl)[]);
    }
    this.rawMessage = instanceToPlain(message);

    this.broadcastChannel?.postMessage(this.rawMessage);

    // set clipboard

    return message.items;
  }

  public async paste(untrustedSystemClipboardDataInString: string | undefined): Promise<boolean> {
    let message: CopyPathsMessage | CopyControlsMessage;
    if (untrustedSystemClipboardDataInString === undefined) {
      if (this.rawMessage === undefined) return false;

      let cc: new (...args: any[]) => CopyPathsMessage | CopyControlsMessage;
      if (this.rawMessage["discriminator"] === "COPY_PATHS") {
        cc = CopyPathsMessage;
      } else if (this.rawMessage["discriminator"] === "COPY_CONTROLS") {
        cc = CopyControlsMessage;
      } else {
        return false;
      }
      message = plainToInstance(cc, this.rawMessage, {
        excludeExtraneousValues: true,
        exposeDefaultValues: true
      });
    } else {
      let untrustedClipboardData: Record<string, any>;
      try {
        untrustedClipboardData = JSON.parse(untrustedSystemClipboardDataInString);
      } catch (e) {
        return false;
      }

      let cc: new (...args: any[]) => CopyPathsMessage | CopyControlsMessage;
      if (untrustedClipboardData["discriminator"] === "COPY_PATHS") {
        cc = CopyPathsMessage;
      } else if (untrustedClipboardData["discriminator"] === "COPY_CONTROLS") {
        cc = CopyControlsMessage;
      } else {
        return false;
      }

      const untrustedMessage = plainToInstance(cc, untrustedClipboardData, {
        excludeExtraneousValues: true,
        exposeDefaultValues: true
      });

      const errors = await validate(untrustedMessage);
      if (errors.length > 0) {
        errors.forEach(e => logger.error("Validation errors", e.constraints, `in ${e.property}`));
        enqueueInfoSnackbar(logger, "Pasting data failed due to validation errors");
        return false;
      }

      const trustedClipboardData = untrustedClipboardData;
      const trustedMessage = untrustedMessage;

      message = trustedMessage;
      this.rawMessage = trustedClipboardData;

      this.broadcastChannel?.postMessage(trustedClipboardData);
    }

    return runInActionAsync(() => message.paste());
  }

  get hasData() {
    return this.rawMessage !== undefined;
  }

  private createBroadcastChannel() {
    if (this.broadcastChannel !== undefined) return undefined;

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("versioning");
      channel.onmessage = event => {
        if (isObject(event.data) === false) return;

        const data = event.data as Record<string, any>;
        if (data["discriminator"] === "SYNC_DATA") {
          if (this.rawMessage !== undefined) {
            channel.postMessage(this.rawMessage);
          }
        } else if (data["discriminator"] === "COPY_PATHS" || data["discriminator"] === "COPY_CONTROLS") {
          this.rawMessage = event.data;
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
      this.rawMessage = JSON.parse(clipboardDataInSessionStorage);
    }

    window.addEventListener("beforeunload", () => {
      if (this.rawMessage !== undefined) {
        window.sessionStorage.setItem("clipboard", JSON.stringify(this.rawMessage));
      }
    });

    // Create broadcast channel to sync clipboard data between tabs
    this.broadcastChannel = this.createBroadcastChannel();
    this.broadcastChannel?.postMessage({ type: "SYNC_DATA" });
  }
}
