import { useEffect } from 'react';
import './App.css';

import { Path } from './math/Path';

import { reaction, action } from "mobx"

import { observer } from "mobx-react-lite"

import Card from '@mui/material/Card';

import { ThemeProvider } from '@mui/material/styles';

import { Box } from '@mui/material';
import { PathsAccordion as EditAccordion } from './app/EditAccordion';
import { FieldCanvasElement } from './app/FieldCanvasElement';
import { useTimer } from './app/Util';
import { GeneralConfigAccordion } from './app/GeneralConfigAccordion';
import { SpeedConfigAccordion } from './app/SpeedControlAccordion';
import { UnitConverter, UnitOfLength } from './math/Unit';
import { OutputConfigAccordion } from './app/OutputAccordion';
import { MainApp } from './app/MainApp';
import { PathTreeAccordion } from './app/PathTreeAccordion';
import { GraphCanvasElement } from './app/GraphCanvasElement';

import { darkTheme, lightTheme } from './app/Theme';
import { MenuAccordion } from './app/MenuAccordion';

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
    app.oc = app.format.buildOutputConfig();

    const uc = new UnitConverter(app.usingUOL, app.gc.uol, 5);

    // UX: Keep some values
    app.gc.pointDensity = uc.fromBtoA(app.gc.pointDensity);
    app.gc.robotWidth = robotWidth;
    app.gc.robotHeight = robotHeight;

    for (const path of app.paths) {
      path.sc = app.format.buildSpeedConfig();
    }
  }

  useEffect(action(() => { // eslint-disable-line react-hooks/exhaustive-deps
    app.paths.map(path => path.calculatePoints(app.gc));
  }), undefined);

  useEffect(action(() => { // eslint-disable-line react-hooks/exhaustive-deps
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
        path.sc.applicationRange.maxLimit.label = newMaxLimit + "";
        path.sc.applicationRange.maxLimit.value = newMaxLimit;

        const ratio = val / oldVal;

        path.sc.applicationRange.from *= ratio;
        path.sc.applicationRange.from = parseFloat(path.sc.applicationRange.from.toFixed(3));
        path.sc.applicationRange.to *= ratio;
        path.sc.applicationRange.to = parseFloat(path.sc.applicationRange.to.toFixed(3));
      }

    }));

    return () => {
      disposer();
      disposer2();
    }
  }), []);

  useEffect(action(initFormat), [app.format]); // eslint-disable-line react-hooks/exhaustive-deps

  const appProps: AppProps = { paths: app.paths, app };

  const themeClass = app.theme.palette.mode === lightTheme.palette.mode ? "light-theme" : "dark-theme";

  // XXX: set key so that the component will be reset when format is changed or app.gc.uol is changed
  return (
    <div className={["App", themeClass].join(" ")} key={app.format.uid + "-" + app.gc.uol}>
      <ThemeProvider theme={app.theme}>
        <Box className='left-editor-container'>
          <MenuAccordion {...appProps} />
          <PathTreeAccordion {...appProps} />
        </Box>

        <Box className='middle-container'>
          <Card className='field-container'>
            <FieldCanvasElement {...appProps} />
          </Card>
          <Card className='graph-container'>
            <GraphCanvasElement {...appProps} />
          </Card>
        </Box>

        <Box className='right-editor-container'>
          <GeneralConfigAccordion {...appProps} />
          <EditAccordion {...appProps} />
          <SpeedConfigAccordion sc={(app.selectedPath || app.paths[0])?.sc} />
          <OutputConfigAccordion {...appProps} />
        </Box>
      </ThemeProvider>
    </div>
  );
});

export default App;

