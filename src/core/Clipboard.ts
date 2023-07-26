import { makeObservable, action } from "mobx";
import { getAppStores } from "./MainApp";
import { Control, EndControl, Path } from "./Path";
import { Logger } from "./Logger";
import { enqueueInfoSnackbar } from "../app/Notice";
import { UnitConverter, UnitOfLength } from "./Unit";
import { instanceToPlain, plainToClassFromExist, plainToInstance } from "class-transformer";
import { makeId, runInActionAsync } from "./Util";
import DOMPurify from "dompurify";
import { AddPath, InsertControls, InsertPaths, RemovePathTreeItems } from "./Command";
import { validate } from "class-validator";

const logger = Logger("Clipboard");

type ClipboardMessageType = "COPY_PATHS" | "COPY_CONTROLS";

interface ClipboardMessage {
  type: ClipboardMessageType;
}

interface SyncDataMessage {
  type: "SYNC_DATA";
}

interface CopyPathsMessage extends ClipboardMessage {
  type: "COPY_PATHS";
  format: string;
  uol: UnitOfLength;
  paths: Record<string, any>[];
}

interface CopyControlsMessage extends ClipboardMessage {
  type: "COPY_CONTROLS";
  format: string;
  uol: UnitOfLength;
  controls: Record<string, any>[];
}

function isSyncDataMessage(data: any): data is SyncDataMessage {
  return typeof data === "object" && data !== null && data.type === "SYNC_DATA";
}

function isCopyPathMessage(data: any): data is CopyPathsMessage {
  return typeof data === "object" && data !== null && data.type === "COPY_PATHS";
}

function isCopyControlsMessage(data: any): data is CopyControlsMessage {
  return typeof data === "object" && data !== null && data.type === "COPY_CONTROLS";
}

export class AppClipboard {
  private broadcastChannel: BroadcastChannel | undefined;

  private message: CopyPathsMessage | CopyControlsMessage | undefined;
  private items: Path[] | (Control | EndControl)[] | undefined;

  public cut(): boolean {
    const { app } = getAppStores();

    if (this.copy() === false || this.items === undefined) return false;

    app.history.execute(`Cut ${this.items.length} path tree items`, new RemovePathTreeItems(app.paths, this.items));

    return true;
  }

  public copy(): boolean {
    const { app } = getAppStores();

    const selected = app.selectedEntities;
    if (selected.length === 0) return false;

    let message: CopyPathsMessage | CopyControlsMessage;

    const isCopyPaths = selected[0] instanceof Path;
    if (selected.some(e => e instanceof Path !== isCopyPaths)) {
      enqueueInfoSnackbar(logger, "Copying controls and paths together is not supported");
      return false;
    }

    if (isCopyPaths) {
      this.items = selected as Path[];
      this.message = message = {
        type: "COPY_PATHS",
        format: app.format.getName(),
        uol: app.gc.uol,
        paths: instanceToPlain(this.items)
      } as CopyPathsMessage;
    } else {
      this.items = selected as (Control | EndControl)[];
      this.message = message = {
        type: "COPY_CONTROLS",
        format: app.format.getName(),
        uol: app.gc.uol,
        controls: instanceToPlain(this.items)
      } as CopyControlsMessage;
    }
    this.broadcastChannel?.postMessage(message);

    return true;
  }

  public async paste(): Promise<boolean> {
    const { app } = getAppStores();
    const purify = DOMPurify();

    if (this.message === undefined) return false;

    const oldUOL = this.message.uol;
    const newUOL = app.gc.uol;
    const uc = new UnitConverter(oldUOL, newUOL);

    if (isCopyPathMessage(this.message)) {
      if (this.message.format !== app.format.getName()) {
        enqueueInfoSnackbar(logger, "Pasting data in other format is not supported");
        return false;
      }

      const paths: Path[] = [];
      for (const pathRaw of this.message.paths) {
        const path = app.format.createPath();
        const pathPC = path.pc;
        plainToClassFromExist(path, pathRaw, { excludeExtraneousValues: true, exposeDefaultValues: true });
        path.pc = plainToClassFromExist(pathPC, pathRaw.pc, {
          excludeExtraneousValues: true,
          exposeDefaultValues: true
        });
        // ALGO: The order of re-assigning the uid shouldn't matter
        path.uid = makeId(10);
        paths.push(path);
      }

      const errors = (await Promise.all(paths.map(path => validate(path)))).flat();
      if (errors.length > 0) {
        errors.forEach(e => logger.error("Validation errors", e.constraints, `in ${e.property}`));
        enqueueInfoSnackbar(logger, "Pasting data failed due to validation errors");
        return false;
      }

      // SECURITY: Do not trust the data from the clipboard, manipulate it after validation

      for (const path of paths) {
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

      await runInActionAsync(() => {
        app.history.execute(`Paste ${paths.length} paths`, new InsertPaths(app.paths, idx, paths));
      });
      app.setSelected(paths.slice());
    } else {
      const controls: (Control | EndControl)[] = [];
      for (const raw of this.message.controls) {
        const control = plainToInstance("heading" in raw ? EndControl : Control, raw);
        control.uid = makeId(10);
        controls.push(control);
      }

      const errors = (await Promise.all(controls.map(control => validate(control)))).flat();
      if (errors.length > 0) {
        errors.forEach(e => logger.error("Validation errors", e.constraints, `in ${e.property}`));
        enqueueInfoSnackbar(logger, "Pasting data failed due to validation errors");
        return false;
      }

      // SECURITY: Do not trust the data from the clipboard, manipulate it after validation

      for (const control of controls) {
        control.x = uc.fromAtoB(control.x);
        control.y = uc.fromAtoB(control.y);
      }

      if (app.paths.length === 0) {
        const newPath = app.format.createPath();
        await runInActionAsync(() => {
          app.history.execute(`Add path ${newPath.uid}`, new AddPath(app.paths, newPath));
        });
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

      await runInActionAsync(() => {
        app.history.execute(`Paste ${controls.length} controls`, new InsertControls(entities, idx, controls));
      });
      app.setSelected(controls.slice());
    }

    return true;
  }

  get hasData() {
    return this.message !== undefined;
  }

  private createBroadcastChannel() {
    if (this.broadcastChannel !== undefined) return undefined;

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("versioning");
      channel.onmessage = event => {
        if (isSyncDataMessage(event.data)) {
          if (this.message !== undefined) {
            channel.postMessage(this.message);
          }
        } else if (isCopyPathMessage(event.data)) {
          this.message = event.data;
        } else if (isCopyControlsMessage(event.data)) {
          this.message = event.data;
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
      const clipboardData = JSON.parse(clipboardDataInSessionStorage);
      if (isCopyPathMessage(clipboardData) || isCopyControlsMessage(clipboardData)) {
        this.message = clipboardData;
      }
    }

    window.addEventListener("beforeunload", () => {
      if (this.message !== undefined) {
        window.sessionStorage.setItem("clipboard", JSON.stringify(this.message));
      }
    });

    // Create broadcast channel to sync clipboard data between tabs
    this.broadcastChannel = this.createBroadcastChannel();
    this.broadcastChannel?.postMessage({ type: "SYNC_DATA" } as SyncDataMessage);
  }
}
