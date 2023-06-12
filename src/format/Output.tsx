import { Confirmation } from "../app/Confirmation";
import { MainApp } from "../app/MainApp";
import { enqueueErrorSnackbar, enqueueSuccessSnackbar } from '../app/Notice';

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

    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();

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
    types: [{ description: 'Path File', accept: { 'text/plain': [] } },],
  };

  try {
    const [fileHandle] = await window.showOpenFilePicker(options);
    app.mountingFile = fileHandle;

    const file = await fileHandle.getFile();
    const contents = await file.text();

    return contents;
  } catch (err) {
    if (err instanceof DOMException) console.log(err); // ignore error
    else enqueueErrorSnackbar(err);

    return undefined;
  }
}

async function choiceSave(app: MainApp): Promise<boolean> {
  const options = {
    types: [{ description: 'Path File', accept: { 'text/plain': [] } },],
    suggestedName: "path.jerryio"
  };

  try {
    const fileHandle = await window.showSaveFilePicker(options);
    app.mountingFile = fileHandle;
    return true;
  } catch (err) {
    console.log(err); // ignore error
    return false;
  }
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
  return true;
}
