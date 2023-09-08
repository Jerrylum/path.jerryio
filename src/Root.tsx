import "./Root.scss";

import { observer } from "mobx-react-lite";

import { ThemeProvider } from "@mui/material/styles";

import { Box } from "@mui/material";
import {
  useClipboardPasteText,
  useCustomHotkeys,
  useDragDropFile,
  useUnsavedChangesPrompt,
  useWindowSize
} from "./core/Hook";
import { getAppStores } from "./core/MainApp";

import { onDownload, onDownloadAs, onDropFile, onNew, onOpen, onSave, onSaveAs } from "./core/InputOutput";
import { NoticeProvider } from "./app/Notice";
import { ConfirmationModal } from "./app/Confirmation";
import { DragDropBackdrop } from "./app/DragDropBackdrop";
import { RemovePathsAndEndControls } from "./core/Command";
import React, { useEffect } from "react";
import { FormTags } from "react-hotkeys-hook/dist/types";
import { LayoutType, getUsableLayout } from "./core/Layout";
import { getAppThemeInfo } from "./app/Theme";
import { ClassisLayout, ExclusiveLayout, LayoutProvider, MobileLayout } from "./app/Layouts";
import { AboutModal } from "./app/AboutModal";
import { WelcomeModal } from "./app/Welcome";
import { PreferencesModal, PreferencesModalSymbol } from "./app/PreferencesModal";
import { AssetManagerModal, AssetManagerModalSymbol } from "./app/AssetManagerModal";

const Root = observer(() => {
  const { app, confirmation, modals, appPreferences, clipboard } = getAppStores();

  const isUsingEditor = !confirmation.isOpen && !modals.isOpen;
  const { isDraggingFile, onDragEnter, onDragLeave, onDragOver, onDrop } = useDragDropFile(isUsingEditor, onDropFile);

  const ENABLE_EXCEPT_INPUT_FIELDS = { enabled: isUsingEditor && !isDraggingFile };

  // UX: Enable custom hotkeys on input fields (e.g. Mod+S) to prevent accidentally triggering the browser default
  // hotkeys when focusing them (e.g. Save page). However, we do not apply it to all hotkeys, because we want to keep
  // some browser default hotkeys on input fields (e.g. Mod+Z to undo user input) instead of triggering custom hotkeys
  // (e.g. Mod+Z to undo field change)
  const ENABLE_ON_ALL_INPUT_FIELDS = {
    ...ENABLE_EXCEPT_INPUT_FIELDS,
    enableOnContentEditable: true,
    enableOnFormTags: true
  };
  const ENABLE_ON_NON_TEXT_INPUT_FIELDS = {
    ...ENABLE_EXCEPT_INPUT_FIELDS,
    preventDefaultOnlyIfEnabled: true,
    enableOnFormTags: ["input", "INPUT"] as FormTags[],
    // UX: It is okay to enable hotkeys on some input fields (e.g. checkbox, button, range)
    enabled: (kvEvt: KeyboardEvent) => {
      if (ENABLE_EXCEPT_INPUT_FIELDS.enabled === false) return false;
      if (kvEvt.target instanceof HTMLInputElement)
        return ["button", "checkbox", "radio", "range", "reset", "submit"].includes(kvEvt.target.type);
      else return true;
    }
  };

  useEffect(() => {
    modals.open(AssetManagerModalSymbol);
  }, []);

  useCustomHotkeys("Mod+P", onNew, ENABLE_ON_ALL_INPUT_FIELDS);
  useCustomHotkeys("Mod+O", onOpen, ENABLE_ON_ALL_INPUT_FIELDS);
  useCustomHotkeys("Mod+S", onSave, ENABLE_ON_ALL_INPUT_FIELDS);
  useCustomHotkeys("Shift+Mod+S", onSaveAs, ENABLE_ON_ALL_INPUT_FIELDS);
  useCustomHotkeys("Mod+D", onDownload, ENABLE_ON_ALL_INPUT_FIELDS);
  useCustomHotkeys("Shift+Mod+D", onDownloadAs, ENABLE_ON_ALL_INPUT_FIELDS);
  useCustomHotkeys("Mod+Comma", () => modals.open(PreferencesModalSymbol), ENABLE_ON_ALL_INPUT_FIELDS);
  useCustomHotkeys("Mod+X", () => clipboard.cut(), ENABLE_ON_NON_TEXT_INPUT_FIELDS);
  useCustomHotkeys("Mod+C", () => clipboard.copy(), ENABLE_ON_NON_TEXT_INPUT_FIELDS);

  useCustomHotkeys("Mod+Z", () => app.history.undo(), ENABLE_ON_NON_TEXT_INPUT_FIELDS);
  useCustomHotkeys("Mod+Y,Shift+Mod+Z", () => app.history.redo(), ENABLE_ON_NON_TEXT_INPUT_FIELDS);
  useCustomHotkeys("Mod+A", () => app.onSelectAll(), ENABLE_ON_NON_TEXT_INPUT_FIELDS);
  useCustomHotkeys("Esc", () => app.clearSelected(), ENABLE_ON_NON_TEXT_INPUT_FIELDS);
  useCustomHotkeys(
    "Shift+Mod+A",
    () => app.setSelected(app.allEntities.filter(e => !app.selectedEntities.includes(e))),
    ENABLE_ON_ALL_INPUT_FIELDS
  );

  useCustomHotkeys(
    "Mod+B",
    () => (appPreferences.isSpeedCanvasVisible = !appPreferences.isSpeedCanvasVisible),
    ENABLE_ON_ALL_INPUT_FIELDS
  );
  useCustomHotkeys(
    "Mod+J",
    () => (appPreferences.isRightPanelVisible = !appPreferences.isRightPanelVisible),
    ENABLE_ON_ALL_INPUT_FIELDS
  );

  useCustomHotkeys("Mod+Add,Mod+Equal", () => (app.fieldEditor.scale += 0.5), ENABLE_ON_ALL_INPUT_FIELDS);
  useCustomHotkeys("Mod+Subtract,Mod+Minus", () => (app.fieldEditor.scale -= 0.5), ENABLE_ON_ALL_INPUT_FIELDS);
  useCustomHotkeys("Mod+0", () => app.resetFieldOffsetAndScale(), ENABLE_ON_ALL_INPUT_FIELDS);

  useCustomHotkeys("R", () => (app.gc.showRobot = !app.gc.showRobot), ENABLE_ON_NON_TEXT_INPUT_FIELDS);

  useCustomHotkeys(
    "Backspace,Delete",
    () => {
      const command = new RemovePathsAndEndControls(app.paths, app.selectedEntityIds);
      app.history.execute(`Remove paths and end controls`, command);
    },
    ENABLE_ON_NON_TEXT_INPUT_FIELDS
  );

  useUnsavedChangesPrompt();

  useClipboardPasteText(document.body, (text, e) => {
    // UX: Do not paste if the user is typing in an input field or content editable element
    // e.target is an input field if the focused element is a text input field, textarea, etc.
    // e.target is body if the focused element is checkbox, button, etc.
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.target instanceof HTMLElement && e.target.isContentEditable) return;
    clipboard.paste(text);
  });

  const windowSize = useWindowSize();
  const usingLayout = getUsableLayout(windowSize, appPreferences.layoutType);

  React.useEffect(() => app.onUIReady(), [app]);

  // XXX: set key so that the component will be reset when format is changed or app.gc.uol is changed
  return (
    <Box
      tabIndex={-1}
      id="root-container"
      data-theme={getAppThemeInfo().styleName}
      data-layout={usingLayout}
      {...{ onDragEnter, onDragOver, onDrop }}
      key={app.format.uid + "-" + app.gc.uol}>
      <ThemeProvider theme={getAppThemeInfo().theme}>
        <NoticeProvider />
        <LayoutProvider value={usingLayout}>
          {usingLayout === LayoutType.Classic && <ClassisLayout />}
          {usingLayout === LayoutType.Exclusive && <ExclusiveLayout />}
          {usingLayout === LayoutType.Mobile && <MobileLayout />}

          <ConfirmationModal />
          <PreferencesModal />
          <WelcomeModal />
          <AboutModal />
          <AssetManagerModal />
        </LayoutProvider>
        {isUsingEditor && isDraggingFile && <DragDropBackdrop {...{ onDragEnter, onDragLeave, onDragOver, onDrop }} />}
      </ThemeProvider>
    </Box>
  );
});

export default Root;
