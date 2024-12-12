import { makeAutoObservable } from "mobx";
import { getAppStores } from "./MainApp";
import { enqueueErrorSnackbar, enqueueSuccessSnackbar } from "@app/Notice";
import { Logger } from "./Logger";
import { isBraveBrowser, isFirefox } from "./Util";

const logger = Logger("I/O");

async function saveConfirm(callback: () => void) {
  const { app, confirmation } = getAppStores();

  return new Promise<boolean>((resolve, reject) => {
    confirmation.prompt({
      title: "Unsaved Changes",
      description: "Do you want to save the changes made to " + app.mountingFile.name + "?",
      buttons: [
        {
          label: "Save",
          color: "success",
          hotkey: "s",
          onClick: async () => {
            if (await onSave()) {
              callback();
              resolve(true);
            } else {
              resolve(false);
            }
          }
        },
        {
          label: "Don't Save",
          hotkey: "n",
          onClick: () => {
            callback();
            resolve(true);
          }
        },
        { label: "Cancel", onClick: () => resolve(false) }
      ]
    });
  });
}

async function fileNameConfirm(description: string, callback: () => void): Promise<boolean> {
  const { app, confirmation } = getAppStores();

  return new Promise<boolean>((resolve, reject) => {
    confirmation.prompt({
      title: "Download",
      description,
      buttons: [
        {
          label: "Confirm",
          color: "success",
          onClick: async () => {
            let candidate = confirmation.input ?? app.mountingFile.name;
            if (candidate.indexOf(".") === -1) candidate += ".txt";
            app.mountingFile.name = candidate;
            app.mountingFile.isNameSet = true;
            callback();
            resolve(true);
          }
        },
        { label: "Cancel", onClick: () => resolve(false) }
      ],
      inputLabel: "File Name",
      inputDefaultValue: app.mountingFile.name
    });
  });
}

function exportFile(): ArrayBuffer | undefined {
  const { app } = getAppStores();

  try {
    return app.exportFile();
  } catch (err) {
    enqueueErrorSnackbar(logger, err);
    return undefined;
  }
}

async function writeFile(buffer: ArrayBuffer): Promise<boolean> {
  const { app } = getAppStores();

  try {
    const file = app.mountingFile;
    if (file.handle === null) throw new Error("fileHandle is undefined");

    // XXX
    await file.handle.requestPermission({ mode: "readwrite" });

    const writable = await file.handle.createWritable();
    await writable.write(buffer);
    await writable.close();

    getAppStores().ga.gtag("event", "write_file_format", { format: app.format.getName() });

    enqueueSuccessSnackbar(logger, "Saved");
    return true;
  } catch (err) {
    if (err instanceof DOMException) enqueueErrorSnackbar(logger, "Failed to save file");
    else enqueueErrorSnackbar(logger, err);
    return false;
  }
}

async function readFile(): Promise<ArrayBuffer | undefined> {
  const { app } = getAppStores();

  const options = {
    types: [{ description: "Path File", accept: { "text/plain": [] } }],
    excludeAcceptAllOption: false,
    multiple: false
  };

  try {
    const [fileHandle] = await showOpenFilePicker(options);
    app.mountingFile.handle = fileHandle;
    app.mountingFile.name = fileHandle.name;
    app.mountingFile.isNameSet = true;

    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();

    return buffer;
  } catch (err) {
    if (err instanceof DOMException === false) enqueueErrorSnackbar(logger, err);
    else logger.error(err); // UX: Do not show DOMException to user, usually means user cancelled

    return undefined;
  }
}

async function readFileFromInput(): Promise<ArrayBuffer | undefined> {
  const { app } = getAppStores();

  const input = document.createElement("input");
  input.type = "file";
  input.multiple = false;
  input.accept = "text/plain";

  // See https://stackoverflow.com/questions/47664777/javascript-file-input-onchange-not-working-ios-safari-only
  Object.assign(input.style, { position: "fixed", top: "-100000px", left: "-100000px" });

  document.body.appendChild(input);

  await new Promise(resolve => {
    input.addEventListener("change", resolve, { once: true });
    input.click();
  });

  // ALGO: Remove polyfill input[type=file] elements, including elements from last time
  document.querySelectorAll("body > input[type=file]").forEach(input => input.remove());

  const file = input.files?.[0];
  if (file === undefined) return undefined;

  app.mountingFile.handle = null;
  app.mountingFile.name = file.name;
  app.mountingFile.isNameSet = true;

  const buffer = await file.arrayBuffer();
  return buffer;
}

function downloadFile(buffer: ArrayBuffer) {
  const { app } = getAppStores();

  const a = document.createElement("a");
  const file = new Blob([buffer], { type: "text/plain" });
  a.href = URL.createObjectURL(file);
  a.download = app.mountingFile.name;
  a.click();

  getAppStores().ga.gtag("event", "download_file_format", { format: app.format.getName() });
}

async function choiceSave(): Promise<boolean> {
  const { app } = getAppStores();

  const options = {
    types: [{ description: "Path File", accept: { "text/plain": [] } }],
    suggestedName: app.mountingFile.name,
    excludeAcceptAllOption: false,
    multiple: false
  };

  try {
    const fileHandle = await window.showSaveFilePicker(options);
    app.mountingFile.handle = fileHandle;
    app.mountingFile.name = fileHandle.name;
    app.mountingFile.isNameSet = true;

    return true;
  } catch (err) {
    logger.error(err); // ignore error
    return false;
  }
}

export class IOFileHandle {
  public isNameSet: boolean = false;
  constructor(public handle: FileSystemFileHandle | null = null, public name: string = "path.jerryio.txt") {
    makeAutoObservable(this);
  }
}

export function isFileSystemSupported() {
  return window.showOpenFilePicker !== undefined && window.showSaveFilePicker !== undefined;
}

export async function onNew(saveCheck: boolean = true): Promise<boolean> {
  const { app } = getAppStores();

  if (saveCheck && app.history.isModified()) return saveConfirm(onNew.bind(null, false));

  app.newFile();
  app.mountingFile = new IOFileHandle();
  return true;
}

export async function onSave(): Promise<boolean> {
  const { app } = getAppStores();

  if (isFileSystemSupported() === false) return onDownload(true);

  if (app.mountingFile.handle === null) return onSaveAs();

  const output = exportFile();
  if (output === undefined) return false;

  if (await writeFile(output)) {
    app.history.save();
    return true;
  } else {
    return false;
  }
}

export async function onSaveAs(): Promise<boolean> {
  const { app } = getAppStores();

  if (isFileSystemSupported() === false) return onDownloadAs(true);

  const output = exportFile();
  if (output === undefined) return false;

  if (!(await choiceSave())) return false;

  if (await writeFile(output)) {
    app.history.save();
    return true;
  } else {
    return false;
  }
}

export async function onOpen(saveCheck: boolean = true, interactive: boolean = true): Promise<boolean> {
  const { app, confirmation } = getAppStores();

  if (saveCheck && app.history.isModified()) return saveConfirm(onOpen.bind(null, false, false));

  if (interactive && isFirefox()) {
    // Resolve: <input> picker was blocked due to lack of user activation.
    await confirmation.prompt({
      title: "Open File",
      description: "Press any key to continue.",
      buttons: [{ label: "Open", color: "success" }],
      onKeyDown: (e, onClick) => onClick(0)
    });
  }

  const buffer = await (isFileSystemSupported() ? readFile() : readFileFromInput());
  if (buffer === undefined) return false;

  try {
    await app.importFile(buffer);
    return true;
  } catch (err) {
    enqueueErrorSnackbar(logger, err);
    return false;
  }
}

/**
 * @returns true if the file is downloaded, false otherwise
 */
export async function onDownload(fallback: boolean = false): Promise<boolean> {
  const { app } = getAppStores();

  if (app.mountingFile.isNameSet === false) return onDownloadAs(fallback);

  const output = exportFile();
  if (output === undefined) return false;

  downloadFile(output);

  return true;
}

/**
 * @returns true if the file is downloaded, false otherwise
 */
export async function onDownloadAs(fallback: boolean = false): Promise<boolean> {
  const output = exportFile();
  if (output === undefined) return false;

  if (fallback) {
    if (isBraveBrowser()) {
      return fileNameConfirm(
        'The "File System Access API" is disabled. Falling back to download.',
        downloadFile.bind(null, output)
      );
    } else {
      return fileNameConfirm(
        "Writing file to the disk is not supported in this browser. Falling back to download.",
        downloadFile.bind(null, output)
      );
    }
  } else {
    return fileNameConfirm("", downloadFile.bind(null, output));
  }
}

export async function onDropFile(file: File, saveCheck: boolean = true): Promise<boolean> {
  const { app } = getAppStores();

  if (saveCheck && app.history.isModified()) return saveConfirm(onDropFile.bind(null, file, false));

  app.mountingFile.handle = null;
  app.mountingFile.name = file.name;
  app.mountingFile.isNameSet = true;

  try {
    await app.importFile(await file.arrayBuffer());
    return true;
  } catch (err) {
    enqueueErrorSnackbar(logger, err);
    return false;
  }
}
