import { useEffect } from 'react';
import './App.css';

import { Path } from './math/Path';
import { CanvasConverter } from './math/Canvas';

import { reaction, action, makeAutoObservable } from "mobx"

import { observer } from "mobx-react-lite"

import Card from '@mui/material/Card';

import { Box } from '@mui/material';
import { PathsAccordion } from './app/PathsAccordion';
import { FieldCanvasElement } from './app/FieldCanvasElement';
import { useTimer } from './app/Util';
import { GeneralConfigAccordion } from './app/GeneralConfigAccordion';
import { SpeedConfigAccordion } from './app/SpeedControlAccordion';
import { UnitConverter, UnitOfLength } from './math/Unit';
import { OutputConfigAccordion } from './app/OutputAccordion';
import { MainApp } from './app/MainApp';
import { PathTreeAccordion } from './app/PathTreeAccordion';

// observable class
class UserBehavior {
  public isPressingCtrl: boolean = false;
  public isPressingShift: boolean = false;
  public mouseX: number = 0;
  public mouseY: number = 0;

  constructor() {
    makeAutoObservable(this);
  }
}

let ub = new UserBehavior();
let app = new MainApp();

export interface AppProps {
  paths: Path[];

  cc: CanvasConverter;
  ub: UserBehavior;
  app: MainApp;
}

const App = observer(() => {
  useTimer(1000 / 30);

  const uc = new UnitConverter(UnitOfLength.Foot, app.gc.uol);
  const canvasSizeInPx = window.innerHeight * 0.94;
  const canvasSizeInUOL = uc.fromAtoB(12);
  const cc = new CanvasConverter(canvasSizeInPx, canvasSizeInPx, canvasSizeInUOL, canvasSizeInUOL);

  const onKeyDown = action((event: KeyboardEvent) => {
    ub.isPressingCtrl = event.ctrlKey || event.metaKey;
    ub.isPressingShift = event.shiftKey;
  });

  const onKeyUp = action((event: KeyboardEvent) => {
    ub.isPressingCtrl = event.ctrlKey || event.metaKey;
    ub.isPressingShift = event.shiftKey;
  });

  function initFormat() {
    if (app.format.isInit) return;

    // ALGO: importPathFileData should init the format and set the app data by itself

    app.format.init();

    const robotWidth = app.gc.robotWidth;
    const robotHeight = app.gc.robotHeight;

    app.gc = app.format.buildGeneralConfig();
    app.sc = app.format.buildSpeedConfig();

    // UX: Keep robot width and height
    app.gc.robotWidth = robotWidth;
    app.gc.robotHeight = robotHeight;
  }

  useEffect(action(() => {
    app.paths.map(path => path.calculateKnots(app.gc, app.sc));
  }), undefined);

  useEffect(action(() => { // eslint-disable-line react-hooks/exhaustive-deps
    document.body.addEventListener('keydown', onKeyDown);
    document.body.addEventListener('keyup', onKeyUp);

    return () => {
      document.body.removeEventListener('keydown', onKeyDown);
      document.body.removeEventListener('keyup', onKeyUp);
    }
  }), []);

  useEffect(action(() => { // eslint-disable-line react-hooks/exhaustive-deps
    initFormat();

    const disposer = reaction(() => app.gc.uol, action((newUOL: UnitOfLength, oldUOL: UnitOfLength) => {
      if (app.usingUOL === newUOL) return;

      const uc = new UnitConverter(oldUOL, newUOL);

      app.selected = [];
      app.expanded = [];

      app.gc.knotDensity = uc.fromAtoB(app.gc.knotDensity);
      app.gc.controlMagnetDistance = uc.fromAtoB(app.gc.controlMagnetDistance);
      app.gc.robotWidth = uc.fromAtoB(app.gc.robotWidth);
      app.gc.robotHeight = uc.fromAtoB(app.gc.robotHeight);

      for (let path of app.paths) {
        for (let control of path.getControlsSet()) {
          control.x = uc.fromAtoB(control.x);
          control.y = uc.fromAtoB(control.y);
        }
      }

      app.usingUOL = newUOL;
    }));

    const disposer2 = reaction(() => app.gc.knotDensity, action((val: number, oldVal: number) => {
      const newMaxLimit = parseFloat((val * 2).toFixed(3));
      app.sc.applicationRange.maxLimit.label = newMaxLimit + "";
      app.sc.applicationRange.maxLimit.value = newMaxLimit;

      const ratio = val / oldVal;

      app.sc.applicationRange.from *= ratio;
      app.sc.applicationRange.from = parseFloat(app.sc.applicationRange.from.toFixed(3));
      app.sc.applicationRange.to *= ratio;
      app.sc.applicationRange.to = parseFloat(app.sc.applicationRange.to.toFixed(3));
    }));

    return () => {
      disposer();
      disposer2();
    }
  }), []);

  useEffect(action(initFormat), [app.format]); // eslint-disable-line react-hooks/exhaustive-deps

  const appProps: AppProps = { paths: app.paths, cc, ub, app };

  // XXX: set key so that the component will be reset when format is changed or app.gc.uol is changed
  return (
    <div className='App' key={app.format.uid + "-" + app.gc.uol}>
      <PathTreeAccordion {...appProps} />

      <Card className='field-container'>
        <FieldCanvasElement {...appProps} />
      </Card>

      <Box className='right-editor-container'>
        <GeneralConfigAccordion {...appProps} />
        <SpeedConfigAccordion sc={app.sc} />
        <OutputConfigAccordion {...appProps} />
        <PathsAccordion {...appProps} />
      </Box>
    </div>
  );
});

export default App;
