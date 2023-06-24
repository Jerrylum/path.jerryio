import { Confirmation } from "../app/Confirmation";
import { MainApp, getAppStores } from "../app/MainApp";
import { enqueueErrorSnackbar, enqueueSuccessSnackbar } from '../app/Notice';

async function saveConfirm(app: MainApp, conf: Confirmation, callback: () => void) {
  return new Promise<boolean>((resolve, reject) => {
    conf.prompt({
      title: "Unsaved Changes",
      description: "Do you want to save the changes made to " + app.mountingFile.name + "?",
      buttons: [
        {
          label: "Save", color: "success", hotkey: "s", onClick: async () => {
            if (await onSave(app, conf)) {
              callback();
              resolve(true);
            } else {
              resolve(false);
            }
          }
        },
        {
          label: "Don't Save", hotkey: "n", onClick: () => {
            callback();
            resolve(true);
          }
        },
        { label: "Cancel", onClick: () => resolve(false) },
      ]
    });
  });
}

async function fileNameConfirm(app: MainApp, conf: Confirmation, description: string, callback: () => void) {
  return new Promise<void>((resolve, reject) => {
    conf.prompt({
      title: "Download",
      description,
      buttons: [{
        label: "Confirm", color: "success", onClick: async () => {
          app.mountingFile.name = conf.input ?? app.mountingFile.name;
          app.mountingFile.isNameSet = true;
          callback();
          resolve();
        }
      }, { label: "Cancel", onClick: () => resolve() }],
      inputLabel: "File Name",
      inputDefaultValue: app.mountingFile.name,
    });
  });
}

function exportPathFile(app: MainApp): string | undefined {
  try {
    return app.format.exportPathFile(app);
  } catch (err) {
    console.log(err);
    enqueueErrorSnackbar(err);
    return undefined;
  }
}

async function writeFile(app: MainApp, contents: string): Promise<boolean> {
  try {
    const file = app.mountingFile;
    if (file.handle === null) throw new Error("fileHandle is undefined");

    // XXX
    await file.handle.requestPermission({ mode: "readwrite" });

    const writable = await file.handle.createWritable();
    await writable.write(contents);
    await writable.close();

    getAppStores().ga.gtag('event', 'write_file_format', { format: app.format.getName() });

    enqueueSuccessSnackbar("Saved");
    return true;
  } catch (err) {
    if (err instanceof DOMException) enqueueErrorSnackbar("Failed to save file");
    else enqueueErrorSnackbar(err);
    return false;
  }
}

async function readFile(app: MainApp): Promise<string | undefined> {
  const options = {
    types: [{ description: 'Path File', accept: { 'text/plain': [] } }],
    excludeAcceptAllOption: false,
    multiple: false
  };

  try {
    const [fileHandle] = await showOpenFilePicker(options);
    app.mountingFile.handle = fileHandle;
    app.mountingFile.name = fileHandle.name;
    app.mountingFile.isNameSet = true;

    const file = await fileHandle.getFile();
    const contents = await file.text();

    return contents;
  } catch (err) {
    if (err instanceof DOMException) console.log(err); // ignore error
    else enqueueErrorSnackbar(err);

    return undefined;
  }
}

async function readFileFromInput(app: MainApp): Promise<string | undefined> {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = false;
  input.accept = "text/plain";

  // See https://stackoverflow.com/questions/47664777/javascript-file-input-onchange-not-working-ios-safari-only
  Object.assign(input.style, { position: 'fixed', top: '-100000px', left: '-100000px' });

  document.body.appendChild(input);

  await new Promise(resolve => {
    input.addEventListener('change', resolve, { once: true });
    input.click();
  });

  // Remove polyfill input[type=file] elements
  document.querySelectorAll("body > input[type=file]").forEach((input) => input.remove());

  const file = input.files?.[0];
  if (file === undefined) return undefined;

  app.mountingFile.handle = null;
  app.mountingFile.name = file.name;
  app.mountingFile.isNameSet = true;

  const reader = new FileReader();
  reader.readAsText(file);

  return new Promise<string | undefined>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(undefined);
  });
}

function downloadFile(app: MainApp, contents: string) {
  const a = document.createElement("a");
  const file = new Blob([contents], { type: "text/plain" });
  a.href = URL.createObjectURL(file);
  a.download = app.mountingFile.name;
  a.click();

  getAppStores().ga.gtag('event', 'download_file_format', { format: app.format.getName() });
}

async function choiceSave(app: MainApp): Promise<boolean> {
  const options = {
    types: [{ description: 'Path File', accept: { 'text/plain': [] } }],
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
    console.log(err); // ignore error
    return false;
  }
}

function isFirefox() {
  return navigator.userAgent.indexOf("Firefox") !== -1;
}

export class OutputFileHandle {
  public isNameSet: boolean = false;
  constructor(public handle: FileSystemFileHandle | null = null, public name: string = "path.jerryio.txt") { }
}

export function isFileSystemSupported() {
  return window.showOpenFilePicker !== undefined && window.showSaveFilePicker !== undefined;
}

export async function onNew(app: MainApp, conf: Confirmation, saveCheck: boolean = true): Promise<boolean> {
  if (saveCheck && app.history.isModified()) return saveConfirm(app, conf, onNew.bind(null, app, conf, false));

  app.newPathFile();
  app.mountingFile = new OutputFileHandle();
  return true;
}

export async function onSave(app: MainApp, conf: Confirmation): Promise<boolean> {
  if (isFileSystemSupported() === false) return onDownload(app, conf, true);

  if (app.mountingFile.handle === null) return onSaveAs(app, conf);

  const output = exportPathFile(app);
  if (output === undefined) return false;

  if (await writeFile(app, output)) {
    app.history.save();
    return true;
  } else {
    return false;
  }
}

export async function onSaveAs(app: MainApp, conf: Confirmation): Promise<boolean> {
  if (isFileSystemSupported() === false) return onDownloadAs(app, conf, true);

  const output = exportPathFile(app);
  if (output === undefined) return false;

  if (!await choiceSave(app)) return false;

  if (await writeFile(app, output)) {
    app.history.save();
    return true;
  } else {
    return false;
  }
}

export async function onOpen(app: MainApp, conf: Confirmation, saveCheck: boolean = true, interactive: boolean = true): Promise<boolean> {
  if (saveCheck && app.history.isModified()) return saveConfirm(app, conf, onOpen.bind(null, app, conf, false, false));

  if (interactive && isFirefox()) {
    // Resolve: <input> picker was blocked due to lack of user activation.
    await conf.prompt({
      title: "Open File",
      description: "Press any key to continue.",
      buttons: [{ label: "Open", color: "success" }],
      onKeyDown: (e, onClick) => onClick(0)
    });
  }

  const contents = await (isFileSystemSupported() ? readFile(app) : readFileFromInput(app));
  if (contents === undefined) return false;

  try {
    app.importPathFile(contents);
    return true;
  } catch (err) {
    enqueueErrorSnackbar(err);
    return false;
  }
}

export async function onDownload(app: MainApp, conf: Confirmation, fallback: boolean = false): Promise<boolean> {
  if (app.mountingFile.isNameSet === false) return onDownloadAs(app, conf, fallback);

  const output = exportPathFile(app);
  if (output === undefined) return false;

  downloadFile(app, output);

  return true;
}

export async function onDownloadAs(app: MainApp, conf: Confirmation, fallback: boolean = false): Promise<boolean> {
  const output = exportPathFile(app);
  if (output === undefined) return false;

  fileNameConfirm(app, conf, fallback ? "Writing file to the disk is not supported in this browser. Falling back to download." : "", downloadFile.bind(null, app, output));

  return true;
}
