import './App.css';

import { Path } from './math/Path';

import { action } from "mobx"
import { observer } from "mobx-react-lite"

import { ThemeProvider } from '@mui/material/styles';

import { Box, Card } from '@mui/material';
import { useCustomHotkeys, useTimer } from './app/Util';
import { MenuAccordion } from './app/MenuAccordion';
import { PathTreeAccordion } from './app/PathTreeAccordion';
import { GeneralConfigAccordion } from './app/GeneralConfigAccordion';
import { PathConfigAccordion } from './app/PathAccordion';
import { ControlAccordion } from './app/ControlAccordion';
import { GraphCanvasElement } from './app/GraphCanvasElement';
import { FieldCanvasElement } from './app/FieldCanvasElement';
import { MainApp } from './app/MainApp';

import React from 'react';
import { onDownload, onNew, onOpen, onSave, onSaveAs } from './format/Output';
import { NoticeProvider } from './app/Notice';

let app = new MainApp();

export interface AppProps {
  paths: Path[];

  app: MainApp;
}

const App = observer(() => {
  useTimer(1000 / 30);

  React.useEffect(action(() => { // eslint-disable-line react-hooks/exhaustive-deps
    app.paths.map(path => path.calculatePoints(app.gc));
  }), undefined);

  const appProps: AppProps = { paths: app.paths, app };

  const themeClass = app.isLightTheme ? "light-theme" : "dark-theme";

  // UX: Enable custom hotkeys on input fields (e.g. Ctrl+S) to prevent accidentally triggering the browser default
  // hotkeys when focusing them (e.g. Save page). However, we do not apply it to all hotkeys, because we want to keep
  // some browser default hotkeys on input fields (e.g. Ctrl+Z to undo user input) instead of triggering custom hotkeys
  // (e.g. Ctrl+Z to undo field change)
  const optionsToEnableHotkeysOnInputFields = { enableOnContentEditable: true, enableOnFormTags: true };

  useCustomHotkeys("Ctrl+P", onNew.bind(null, app), optionsToEnableHotkeysOnInputFields);
  useCustomHotkeys("Ctrl+O", onOpen.bind(null, app), optionsToEnableHotkeysOnInputFields);
  useCustomHotkeys("Ctrl+S", onSave.bind(null, app), optionsToEnableHotkeysOnInputFields);
  useCustomHotkeys("Ctrl+Shift+S", onSaveAs.bind(null, app), optionsToEnableHotkeysOnInputFields);
  useCustomHotkeys("Ctrl+D", onDownload.bind(null, app), optionsToEnableHotkeysOnInputFields);
  useCustomHotkeys("Ctrl+,", () => console.log("Preferences"));

  useCustomHotkeys("Ctrl+Z", () => app.history.undo());
  useCustomHotkeys("Ctrl+Y,Ctrl+Shift+Z", () => app.history.redo());
  useCustomHotkeys("Ctrl+A", () => {
    const path = app.selectedPath;
    const all = path !== undefined ? [path, ...path.controls] : app.allEntities;
    app.setSelected(all);
  });
  useCustomHotkeys("Esc", () => app.clearSelected());
  useCustomHotkeys("Ctrl+Shift+A", () => {
    const path = app.selectedPath;
    const all = path !== undefined ? [path, ...path.controls] : app.allEntities;
    app.setSelected(all.filter(e => !app.selectedEntities.includes(e)));
  });

  useCustomHotkeys("Ctrl+B", () => app.view.showSpeedCanvas = !app.view.showSpeedCanvas);
  useCustomHotkeys("Ctrl+J", () => app.view.showRightPanel = !app.view.showRightPanel);

  useCustomHotkeys("Ctrl+Add,Ctrl+Equal", () => app.fieldScale += 0.5);
  useCustomHotkeys("Ctrl+Subtract,Ctrl+Minus", () => app.fieldScale -= 0.5);
  useCustomHotkeys("Ctrl+0", () => app.resetFieldDisplay());

  // XXX: set key so that the component will be reset when format is changed or app.gc.uol is changed
  return (
    <div className={["App", themeClass].join(" ")} key={app.format.uid + "-" + app.gc.uol}>
      <ThemeProvider theme={app.theme}>
        <NoticeProvider />
        <Box id='left-editor-panel'>
          <MenuAccordion {...appProps} />
          <PathTreeAccordion {...appProps} />
        </Box>

        <Box id='middle-panel' className={app.view.showSpeedCanvas ? "" : "fullscreen"}>
          <Card id='field-panel'>
            <FieldCanvasElement {...appProps} />
          </Card>
          {
            app.view.showSpeedCanvas && (
              <Card id='graph-panel'>
                <GraphCanvasElement {...appProps} />
              </Card>
            )
          }
        </Box>
        {
          app.view.showRightPanel && (
            <Box id='right-editor-panel'>
              <GeneralConfigAccordion {...appProps} />
              <ControlAccordion {...appProps} />
              <PathConfigAccordion pc={app.selectedPath?.pc} app={app} />
            </Box>
          )
        }
      </ThemeProvider>
    </div>
  );
});

export default App;

