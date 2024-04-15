import "./Root.scss";

import { observer } from "mobx-react-lite";

import { ThemeProvider } from "@mui/material/styles";

import { Box } from "@mui/material";
import {
  getEnableOnAllInputFieldsHotkeysOptions,
  getEnableOnNonTextInputFieldsHotkeysOptions,
  useClipboardPasteText,
  useCustomHotkeys,
  useDragDropFile,
  useUnsavedChangesPrompt,
  useWindowSize
} from "./core/Hook";
import { getAppStores } from "./core/MainApp";

import { onDownload, onDownloadAs, onDropFile, onNew, onOpen, onSave, onSaveAs } from "./core/InputOutput";
import { NoticeProvider } from "./app/Notice";
import { ConfirmationModal } from "./app/common.blocks/modal/ConfirmationModal";
import { DragDropBackdrop } from "./app/common.blocks/DragDropBackdrop";
import { RemovePathsAndEndControls } from "./core/Command";
import React from "react";
import { LayoutType, getUsableLayout } from "./core/Layout";
import { getAppThemeInfo } from "./app/Theme";
import { LayoutProvider } from "./app/Layouts";
import { AboutModal } from "./app/common.blocks/modal/AboutModal";
import { WelcomeModal } from "./app/common.blocks/modal/WelcomeModal";
import { PreferencesModal, PreferencesModalSymbol } from "./app/common.blocks/modal/PreferencesModal";
import { AssetManagerModal } from "./app/common.blocks/modal/AssetManagerModal";
import { RequireLocalFieldImageModal } from "./app/common.blocks/modal/RequireLocalFieldImageModal";
import { ClassisLayout } from "./app/classic.blocks/_index";
import { ExclusiveLayout } from "./app/exclusive.blocks/_index";
import { MobileLayout } from "./app/mobile.blocks/_index";

const Root = observer(() => {
  const { app, confirmation, modals, appPreferences, clipboard } = getAppStores();

  const isUsingEditor = !confirmation.isOpen && !modals.isOpen;
  const { isDraggingFile, onDragEnter, onDragLeave, onDragOver, onDrop } = useDragDropFile(isUsingEditor, onDropFile);

  const isEnableInputField = isUsingEditor && !isDraggingFile;

  // UX: Enable custom hotkeys on input fields (e.g. Mod+S) to prevent accidentally triggering the browser default
  // hotkeys when focusing them (e.g. Save page). However, we do not apply it to all hotkeys, because we want to keep
  // some browser default hotkeys on input fields (e.g. Mod+Z to undo user input) instead of triggering custom hotkeys
  // (e.g. Mod+Z to undo field change)
  const option1 = getEnableOnAllInputFieldsHotkeysOptions(isEnableInputField);
  const option2 = getEnableOnNonTextInputFieldsHotkeysOptions(isEnableInputField);

  useCustomHotkeys("Mod+P", onNew, option1);
  useCustomHotkeys("Mod+O", onOpen, option1);
  useCustomHotkeys("Mod+S", onSave, option1);
  useCustomHotkeys("Shift+Mod+S", onSaveAs, option1);
  useCustomHotkeys("Mod+D", onDownload, option1);
  useCustomHotkeys("Shift+Mod+D", onDownloadAs, option1);
  useCustomHotkeys("Mod+Comma", () => modals.open(PreferencesModalSymbol), option1);
  useCustomHotkeys("Mod+X", () => clipboard.cut(), option2);
  useCustomHotkeys("Mod+C", () => clipboard.copy(), option2);

  useCustomHotkeys("Mod+Z", () => app.history.undo(), option2);
  useCustomHotkeys("Mod+Y,Shift+Mod+Z", () => app.history.redo(), option2);
  useCustomHotkeys("Mod+A", () => app.onSelectAll(), option2);
  useCustomHotkeys("Esc", () => app.clearSelected(), option2);
  useCustomHotkeys(
    "Shift+Mod+A",
    () => app.setSelected(app.allEntities.filter(e => !app.selectedEntities.includes(e))),
    option1
  );

  useCustomHotkeys(
    "Mod+B",
    () => (appPreferences.isSpeedCanvasVisible = !appPreferences.isSpeedCanvasVisible),
    option1
  );
  useCustomHotkeys(
    "Mod+J",
    () => (appPreferences.isRightSectionVisible = !appPreferences.isRightSectionVisible),
    option1
  );

  useCustomHotkeys("Mod+Add,Mod+Equal", () => (app.fieldEditor.scale += 0.5), option1);
  useCustomHotkeys("Mod+Subtract,Mod+Minus", () => (app.fieldEditor.scale -= 0.5), option1);
  useCustomHotkeys("Mod+0", () => app.resetFieldOffsetAndScale(), option1);

  useCustomHotkeys("R", () => (app.gc.showRobot = !app.gc.showRobot), option2);

  useCustomHotkeys(
    "Backspace,Delete",
    () => {
      const command = new RemovePathsAndEndControls(app.paths, app.selectedEntityIds);
      app.history.execute(`Remove paths and end controls`, command);
    },
    option2
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
      id="Root-Container"
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
          <RequireLocalFieldImageModal />
        </LayoutProvider>
        {isUsingEditor && isDraggingFile && <DragDropBackdrop {...{ onDragEnter, onDragLeave, onDragOver, onDrop }} />}
      </ThemeProvider>
    </Box>
  );
});

export default Root;
