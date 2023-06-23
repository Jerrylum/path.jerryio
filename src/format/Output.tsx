import { Confirmation } from "../app/Confirmation";
import { MainApp, getAppStores } from "../app/MainApp";
import { enqueueErrorSnackbar, enqueueSuccessSnackbar } from '../app/Notice';
import { showOpenFilePicker, showSaveFilePicker } from 'native-file-system-adapter'

async function saveConfirm(app: MainApp, confirmation: Confirmation, callback: () => void) {
  return new Promise<boolean>((resolve, reject) => {
    confirmation.prompt({
      title: "Unsaved Changes",
      description: "Do you want to save the changes made to " + (app.mountingFile?.name ?? "path.jerryio.txt") + "?",
      buttons: [
        {
          label: "Save", color: "success", hotkey: "s", onClick: async () => {
            if (await onSave(app)) {
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
    const fileHandle = app.mountingFile;
    if (fileHandle === null) throw new Error("fileHandle is undefined");

    await fileHandle.requestPermission({ mode: "readwrite" });

    const writable = await fileHandle.createWritable();
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
    types: [{ description: 'Path File', accept: { 'text/plain': [] } }], // For native
    excludeAcceptAllOption: false, // For native & polyfill
    multiple: false, // For native & polyfill
    accepts: ["text/plain"] // For polyfill
  };

  try {
    const [fileHandle] = await showOpenFilePicker(options);
    app.mountingFile = fileHandle as unknown as FileSystemFileHandle;

    const file = await fileHandle.getFile();
    const contents = await file.text();

    return contents;
  } catch (err) {
    if (err instanceof DOMException) console.log(err); // ignore error
    else enqueueErrorSnackbar(err);

    return undefined;
  }
}

/*
Notice message for user

Writing file to the disk is not supported in this browser. Falling back to download. 



*/

async function choiceSave(app: MainApp): Promise<boolean> {
  const options = {
    types: [{ description: 'Path File', accept: { 'text/plain': [] } }], // For native
    suggestedName: "path.jerryio", // For native & polyfill
    excludeAcceptAllOption: false, // For native & polyfill
    multiple: false, // For native & polyfill
    accepts: ["text/plain"] // For polyfill, might not used
  };

  try {
    const fileHandle = await showSaveFilePicker(options);
    app.mountingFile = fileHandle as unknown as FileSystemFileHandle;

    return true;
  } catch (err) {
    console.log(err); // ignore error
    return false;
  }
}

export function isFileSystemSupported() {
  return window.showOpenFilePicker === undefined && window.showSaveFilePicker === undefined;
}

export async function onNew(app: MainApp, confirmation: Confirmation, saveCheck: boolean = true): Promise<boolean> {
  if (saveCheck && app.history.isModified()) return saveConfirm(app, confirmation, onNew.bind(null, app, confirmation, false));

  app.newPathFile();
  app.mountingFile = null;
  return true;
}

export async function onSave(app: MainApp): Promise<boolean> {
  if (app.mountingFile === null) return onSaveAs(app);

  const output = exportPathFile(app);
  if (output === undefined) return false;

  if (await writeFile(app, output)) {
    app.history.save();
    return true;
  } else {
    return false;
  }
}

export async function onSaveAs(app: MainApp): Promise<boolean> {
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

export async function onOpen(app: MainApp, confirmation: Confirmation, saveCheck: boolean = true): Promise<boolean> {
  if (saveCheck && app.history.isModified()) return saveConfirm(app, confirmation, onOpen.bind(null, app, confirmation, false));

  let contents = await readFile(app);
  if (contents === undefined) return false;

  try {
    app.importPathFile(contents);
    return true;
  } catch (err) {
    enqueueErrorSnackbar(err);
    return false;
  }
}

export function onDownload(app: MainApp) {
  const output = exportPathFile(app);
  if (output === undefined) return false;

  const a = document.createElement("a");
  const file = new Blob([output], { type: "text/plain" });
  a.href = URL.createObjectURL(file);
  a.download = "path.jerryio.txt"; // TODO better file name
  a.click();

  getAppStores().ga.gtag('event', 'download_file_format', { format: app.format.getName() });

  return true;
}
