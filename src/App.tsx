import './App.css';

import { Path } from './math/Path';

import { reaction, action, runInAction } from "mobx"
import { observer } from "mobx-react-lite"

import { ThemeProvider } from '@mui/material/styles';

import { Box, Card } from '@mui/material';
import { useKeyName, useTimer } from './app/Util';
import { MenuAccordion } from './app/MenuAccordion';
import { PathTreeAccordion } from './app/PathTreeAccordion';
import { GeneralConfigAccordion } from './app/GeneralConfigAccordion';
import { PathConfigAccordion } from './app/PathAccordion';
import { ControlAccordion } from './app/ControlAccordion';
import { GraphCanvasElement } from './app/GraphCanvasElement';
import { FieldCanvasElement } from './app/FieldCanvasElement';
import { UnitConverter, UnitOfLength } from './math/Unit';
import { MainApp } from './app/MainApp';

import { darkTheme, lightTheme } from './app/Theme';
import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook'
import { HotkeysEvent } from 'react-hotkeys-hook/dist/types'
import { onDownload, onNew, onOpen, onSave, onSaveAs } from './format/Output';

let app = new MainApp();

export interface AppProps {
  paths: Path[];

  app: MainApp;
}

const App = observer(() => {
  useTimer(1000 / 30);

  function initFormat() {
    if (app.format.isInit) return;

    // ALGO: importPathFileData should init the format and set the app data by itself

    app.format.init();

    const robotWidth = app.gc.robotWidth;
    const robotHeight = app.gc.robotHeight;

    app.gc = app.format.buildGeneralConfig();

    const uc = new UnitConverter(app.usingUOL, app.gc.uol, 5);

    // UX: Keep some values
    app.gc.pointDensity = uc.fromBtoA(app.gc.pointDensity);
    app.gc.robotWidth = robotWidth;
    app.gc.robotHeight = robotHeight;

    for (const path of app.paths) {
      path.pc = app.format.buildPathConfig();
    }
  }

  React.useEffect(action(() => { // eslint-disable-line react-hooks/exhaustive-deps
    app.paths.map(path => path.calculatePoints(app.gc));
  }), undefined);

  React.useEffect(action(() => { // eslint-disable-line react-hooks/exhaustive-deps
    initFormat();

    const disposer = reaction(() => app.gc.uol, action((newUOL: UnitOfLength, oldUOL: UnitOfLength) => {
      if (app.usingUOL === newUOL) return;

      const uc = new UnitConverter(oldUOL, newUOL);

      app.selected = [];
      app.expanded = [];
      app.gc.pointDensity = uc.fromAtoB(app.gc.pointDensity);
      app.gc.controlMagnetDistance = uc.fromAtoB(app.gc.controlMagnetDistance);
      app.gc.robotWidth = uc.fromAtoB(app.gc.robotWidth);
      app.gc.robotHeight = uc.fromAtoB(app.gc.robotHeight);

      for (const path of app.paths) {
        for (const control of path.controls) {
          control.x = uc.fromAtoB(control.x);
          control.y = uc.fromAtoB(control.y);
        }
      }

      app.usingUOL = newUOL;
    }));

    const disposer2 = reaction(() => app.gc.pointDensity, action((val: number, oldVal: number) => {
      const newMaxLimit = parseFloat((val * 2).toFixed(3));

      for (const path of app.paths) {
        path.pc.applicationRange.maxLimit.label = newMaxLimit + "";
        path.pc.applicationRange.maxLimit.value = newMaxLimit;

        const ratio = val / oldVal;

        path.pc.applicationRange.from *= ratio;
        path.pc.applicationRange.from = parseFloat(path.pc.applicationRange.from.toFixed(3));
        path.pc.applicationRange.to *= ratio;
        path.pc.applicationRange.to = parseFloat(path.pc.applicationRange.to.toFixed(3));
      }

    }));

    return () => {
      disposer();
      disposer2();
    }
  }), []);

  React.useEffect(action(() => {

  }), []);

  React.useEffect(action(initFormat), [app.format]); // eslint-disable-line react-hooks/exhaustive-deps

  const appProps: AppProps = { paths: app.paths, app };

  const themeClass = app.theme.palette.mode === lightTheme.palette.mode ? "light-theme" : "dark-theme";

  function onKeybind(func: (app: MainApp) => void) {
    return function (kvEvt: KeyboardEvent, hkEvt: HotkeysEvent) {
      kvEvt.preventDefault();
      kvEvt.stopPropagation();
      runInAction(() => func(app));
    }
  }

  useHotkeys(useKeyName("Ctrl+N"), onKeybind(onNew));
  useHotkeys(useKeyName("Ctrl+O"), onKeybind(onOpen));
  useHotkeys(useKeyName("Ctrl+S"), onKeybind(onSave));
  useHotkeys(useKeyName("Ctrl+Shift+S"), onKeybind(onSaveAs));
  useHotkeys(useKeyName("Ctrl+D"), onKeybind(onDownload));
  useHotkeys(useKeyName("Ctrl+,"), onKeybind(() => console.log("Preferences")));

  useHotkeys(useKeyName("Ctrl+Z"), onKeybind(() => console.log("Undo")));
  useHotkeys(useKeyName("Ctrl+Y,Ctrl+Shift+Z"), onKeybind(() => console.log("Redo")));
  useHotkeys(useKeyName("Ctrl+A"), onKeybind(() => console.log("Select All")));
  useHotkeys(useKeyName("Ctrl+Shift+A"), onKeybind(() => console.log("Select Inverse")));
  useHotkeys(useKeyName("Esc"), onKeybind(() => console.log("Select None")));

  // XXX: set key so that the component will be reset when format is changed or app.gc.uol is changed
  return (
    <div className={["App", themeClass].join(" ")} key={app.format.uid + "-" + app.gc.uol}>
      <ThemeProvider theme={app.theme}>
        <Box id='left-editor-panel'>
          <MenuAccordion {...appProps} />
          <PathTreeAccordion {...appProps} />
        </Box>

        <Box id='middle-panel'>
          <Card id='field-panel'>
            <FieldCanvasElement {...appProps} />
          </Card>
          <Card id='graph-panel'>
            <GraphCanvasElement {...appProps} />
          </Card>
        </Box>

        <Box id='right-editor-panel'>
          <GeneralConfigAccordion {...appProps} />
          <ControlAccordion {...appProps} />
          <PathConfigAccordion pc={app.selectedPath?.pc} />
        </Box>
      </ThemeProvider>
    </div>
  );
});

export default App;

