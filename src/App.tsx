import { useEffect, useState } from 'react';
import './App.css';

import { Path, Vertex } from './math/path';
import { CanvasConverter, InteractiveEntity } from './math/canvas';

import { reaction, action, makeAutoObservable } from "mobx"

import { observer } from "mobx-react-lite"

import Card from '@mui/material/Card';

import { Box } from '@mui/material';
import { PathsAccordion } from './app/PathsAccordion';
import { FieldCanvasElement } from './app/FieldCanvasElement';
import { addToArray, removeFromArray, useTimer } from './app/Util';
import { Format } from './format/format';
import { GeneralConfigAccordion } from './app/GeneralConfigAccordion';
import { SpeedConfigAccordion } from './app/SpeedControlAccordion';
import { PathDotJerryioFormatV0_1 } from './format/PathDotJerryioFormatV0_1';
import { GeneralConfig, OutputConfig, SpeedConfig } from './format/config';
import { UnitConverter, UnitOfLength } from './math/unit';
import { OutputConfigAccordion } from './app/OutputAccordion';

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

// observable class
export class MainApp {
  public gc: GeneralConfig = new GeneralConfig(); // a.k.a Configuration
  public sc: SpeedConfig = new SpeedConfig(); // a.k.a Speed Control
  public oc: OutputConfig = new OutputConfig(); // a.k.a Output

  public paths: Path[] = [];
  public selected: string[] = [];
  public expanded: string[] = [];
  public magnet: Vertex = new Vertex(Infinity, Infinity);

  constructor() {
    makeAutoObservable(this);
  }

  isSelected(x: InteractiveEntity | string): boolean {
    return typeof x === "string" ? this.selected.includes(x) : this.selected.includes(x.uid);
  }

  addSelected(x: InteractiveEntity | string): boolean {
    return addToArray(this.selected, typeof x === "string" ? x : x.uid);
  }

  removeSelected(x: InteractiveEntity | string): boolean {
    return removeFromArray(this.selected, typeof x === "string" ? x : x.uid);
  }

  isExpanded(x: InteractiveEntity | string): boolean {
    return typeof x === "string" ? this.expanded.includes(x) : this.expanded.includes(x.uid);
  }

  addExpanded(x: InteractiveEntity | string): boolean {
    return addToArray(this.expanded, typeof x === "string" ? x : x.uid);
  }

  removeExpanded(x: InteractiveEntity | string): boolean {
    return removeFromArray(this.expanded, typeof x === "string" ? x : x.uid);
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

  const [format, setFormat] = useState<Format>(new PathDotJerryioFormatV0_1());

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
    if (format.isInit) return;

    format.init();

    const robotWidth = app.gc.robotWidth;
    const robotHeight = app.gc.robotHeight;

    app.gc = format.buildGeneralConfig();
    app.sc = format.buildSpeedConfig();

    // UX: Keep robot width and height
    app.gc.robotWidth = robotWidth;
    app.gc.robotHeight = robotHeight;
  }

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
      const uc = new UnitConverter(oldUOL, newUOL);

      app.selected = [];
      app.expanded = [];

      app.gc.robotWidth = uc.fromAtoB(app.gc.robotWidth);
      app.gc.robotHeight = uc.fromAtoB(app.gc.robotHeight);

      for (let path of app.paths) {
        for (let control of path.getControlsSet()) {
          control.x = uc.fromAtoB(control.x);
          control.y = uc.fromAtoB(control.y);
        }
      }
    }));

    return () => {
      disposer();
    }
  }), []);

  useEffect(action(initFormat), [format]); // eslint-disable-line react-hooks/exhaustive-deps

  const appProps: AppProps = { paths: app.paths, cc, ub, app };

  // XXX: set key so that the component will be reset when format is changed or app.gc.uol is changed
  return (
    <div className='App' key={format.uid + "-" + app.gc.uol}>
      <Card className='field-container'>
        <FieldCanvasElement {...appProps} />
      </Card>

      <Box className='editor-container'>
        <GeneralConfigAccordion gc={app.gc} {...{format, setFormat}} />
        <SpeedConfigAccordion sc={app.sc} />
        <OutputConfigAccordion {...appProps} {...{format}} />
        <PathsAccordion {...appProps} />
      </Box>
    </div>
  );
});

export default App;
