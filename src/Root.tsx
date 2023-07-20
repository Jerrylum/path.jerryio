import "./App.scss";

import { observer } from "mobx-react-lite";

import { ThemeProvider } from "@mui/material/styles";

import { Box, Card } from "@mui/material";
import { useCustomHotkeys, useDragDropFile, useUnsavedChangesPrompt } from "./core/Util";
import { MenuAccordion } from "./app/MenuAccordion";
import { GeneralConfigAccordion } from "./app/GeneralConfigAccordion";
import { PathConfigAccordion } from "./app/PathAccordion";
import { ControlAccordion } from "./app/ControlAccordion";
import { GraphCanvasElement } from "./app/GraphCanvasElement";
import { FieldCanvasElement } from "./app/FieldCanvasElement";
import { useAppStores } from "./core/MainApp";

import classNames from "classnames";
import { onDownload, onDownloadAs, onDropFile, onNew, onOpen, onSave, onSaveAs } from "./core/InputOutput";
import { NoticeProvider } from "./app/Notice";
import { ConfirmationDialog } from "./app/Confirmation";
import { HelpDialog } from "./app/HelpDialog";
import { PreferencesDialog } from "./app/Preferences";
import { DragDropBackdrop } from "./app/DragDropBackdrop";
import { RemovePathsAndEndControls } from "./core/Command";
import React from "react";
import { PathTreeAccordion } from "./app/PathTreeAccordion";

const Root = observer(() => {
  const { app, confirmation, help, appPreferences, clipboard } = useAppStores();

  const isUsingEditor = !confirmation.isOpen && !help.isOpen && !appPreferences.isOpen;
  const { isDraggingFile, onDragEnter, onDragLeave, onDragOver, onDrop } = useDragDropFile(
    isUsingEditor,
    onDropFile.bind(null, app, confirmation)
  );

  const optionsToEnableHotkeys = { enabled: isUsingEditor && !isDraggingFile };

  // UX: Enable custom hotkeys on input fields (e.g. Mod+S) to prevent accidentally triggering the browser default
  // hotkeys when focusing them (e.g. Save page). However, we do not apply it to all hotkeys, because we want to keep
  // some browser default hotkeys on input fields (e.g. Mod+Z to undo user input) instead of triggering custom hotkeys
  // (e.g. Mod+Z to undo field change)
  const optionsToEnableHotkeysOnInputFields = { enableOnContentEditable: true, ...optionsToEnableHotkeys };

  useCustomHotkeys("Mod+P", onNew.bind(null, app, confirmation), optionsToEnableHotkeysOnInputFields);
  useCustomHotkeys("Mod+O", onOpen.bind(null, app, confirmation), optionsToEnableHotkeysOnInputFields);
  useCustomHotkeys("Mod+S", onSave.bind(null, app, confirmation), optionsToEnableHotkeysOnInputFields);
  useCustomHotkeys("Mod+Shift+S", onSaveAs.bind(null, app, confirmation), optionsToEnableHotkeysOnInputFields);
  useCustomHotkeys("Mod+D", onDownload.bind(null, app, confirmation), optionsToEnableHotkeysOnInputFields);
  useCustomHotkeys("Mod+Shift+D", onDownloadAs.bind(null, app, confirmation), optionsToEnableHotkeysOnInputFields);
  useCustomHotkeys("Mod+Comma", () => appPreferences.open(), optionsToEnableHotkeys);
  useCustomHotkeys("Mod+X", () => clipboard.cut(), optionsToEnableHotkeys);
  useCustomHotkeys("Mod+C", () => clipboard.copy(), optionsToEnableHotkeys);
  useCustomHotkeys("Mod+V", () => clipboard.paste(), optionsToEnableHotkeys);

  useCustomHotkeys("Mod+Z", () => app.history.undo(), optionsToEnableHotkeys);
  useCustomHotkeys("Mod+Y,Mod+Shift+Z", () => app.history.redo(), optionsToEnableHotkeys);
  useCustomHotkeys(
    "Mod+A",
    () => {
      const path = app.selectedPath;
      const all = path !== undefined ? [path, ...path.controls] : app.allEntities;
      app.setSelected(all);
    },
    optionsToEnableHotkeys
  );
  useCustomHotkeys("Esc", () => app.clearSelected(), optionsToEnableHotkeys);
  useCustomHotkeys(
    "Mod+Shift+A",
    () => {
      const path = app.selectedPath;
      const all = path !== undefined ? [path, ...path.controls] : app.allEntities;
      app.setSelected(all.filter(e => !app.selectedEntities.includes(e)));
    },
    optionsToEnableHotkeys
  );

  useCustomHotkeys("Mod+B", () => (app.view.showSpeedCanvas = !app.view.showSpeedCanvas), optionsToEnableHotkeys);
  useCustomHotkeys("Mod+J", () => (app.view.showRightPanel = !app.view.showRightPanel), optionsToEnableHotkeys);

  useCustomHotkeys("Mod+Add,Mod+Equal", () => (app.fieldScale += 0.5), optionsToEnableHotkeys);
  useCustomHotkeys("Mod+Subtract,Mod+Minus", () => (app.fieldScale -= 0.5), optionsToEnableHotkeys);
  useCustomHotkeys("Mod+0", () => app.resetFieldDisplay(), optionsToEnableHotkeys);

  useCustomHotkeys("R", () => (app.gc.showRobot = !app.gc.showRobot), {
    ...optionsToEnableHotkeys,
    preventDefaultOnlyIfEnabled: true,
    enableOnFormTags: ["input", "INPUT"],
    // UX: A special case for input[type="checkbox"], it is okay to enable hotkeys on it
    enabled: (kvEvt: KeyboardEvent) =>
      optionsToEnableHotkeys.enabled &&
      (kvEvt.target instanceof HTMLInputElement === false || (kvEvt.target as HTMLInputElement).type === "checkbox")
  });

  useCustomHotkeys(
    "Backspace,Delete",
    () => {
      const command = new RemovePathsAndEndControls(app.paths, app.selectedEntityIds);
      app.history.execute(`Remove paths and end controls`, command);
    },
    { ...optionsToEnableHotkeys, preventDefaultOnlyIfEnabled: true }
  );

  useUnsavedChangesPrompt();

  React.useEffect(() => app.onUIReady(), [app]);

  // XXX: set key so that the component will be reset when format is changed or app.gc.uol is changed
  return (
    <Box
      tabIndex={-1}
      className={classNames("App", appPreferences.theme.className)}
      {...{ onDragEnter, onDragOver, onDrop }}
      key={app.format.uid + "-" + app.gc.uol}>
      <ThemeProvider theme={appPreferences.theme.theme}>
        <NoticeProvider />
        <Box id="left-editor-panel">
          <MenuAccordion />
          <PathTreeAccordion />
        </Box>

        <Box id="middle-panel" className={app.view.showSpeedCanvas ? "" : "full-height"}>
          <Card id="field-panel">
            <FieldCanvasElement />
          </Card>
          {app.view.showSpeedCanvas && (
            <Card id="graph-panel">
              <GraphCanvasElement />
            </Card>
          )}
        </Box>
        {app.view.showRightPanel && (
          <Box id="right-editor-panel">
            <GeneralConfigAccordion />
            <ControlAccordion />
            <PathConfigAccordion />
          </Box>
        )}
        <ConfirmationDialog />
        <HelpDialog />
        <PreferencesDialog />
        {isUsingEditor && isDraggingFile && <DragDropBackdrop {...{ onDragEnter, onDragLeave, onDragOver, onDrop }} />}
      </ThemeProvider>
    </Box>
  );
});

export default Root;
