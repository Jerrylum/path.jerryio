import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

import { Control, EndPointControl, Spline, Path, Vertex, InteractiveEntity } from './math/path';
import { CanvasConfig } from './math/shape';

import { reaction, action, observable, makeAutoObservable } from "mobx"

import { observer } from "mobx-react-lite"

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextField from '@mui/material/TextField';

import { Box, Button, Checkbox, FormControlLabel, MenuItem, Select } from '@mui/material';
import { SpeedConfig, SpeedConfigAccordion } from './app/SpeedControlAccordion';
import { PathsAccordion } from './app/PathsAccordion';
import { FieldCanvasElement } from './app/FieldCanvasElement';
import { useTimer } from './app/Util';
import { GeneralConfig, GeneralConfigAccordion, UnitConverter, UnitOfLength } from './app/GeneralConfigAccordion';
import { LemLibFormatV0_4 } from './math/LemLibFormatV0_4';
import { Format } from './math/format';
import { PathDotJerryioFormatV0_1 } from './math/PathDotJerryioFormatV0_1';

class UserBehavior {
  public isPressingCtrl: boolean = false;
  public isPressingShift: boolean = false;
  public mouseX: number = 0;
  public mouseY: number = 0;
}


// observable class
class MainApp {
  gc: GeneralConfig = new GeneralConfig(); // a.k.a Configuration
  sc: SpeedConfig = new SpeedConfig(); // a.k.a Speed Control

  paths: Path[] = [];
  selected: string[] = [];
  expanded: string[] = [];
  magnet: Vertex = new Vertex(Infinity, Infinity);

  constructor() {
    makeAutoObservable(this);
  }

  isSelected(x: InteractiveEntity | string): boolean {
    return typeof x === "string" ? this.selected.includes(x) : this.selected.includes(x.uid);
  }

  addSelected(x: InteractiveEntity | string): boolean {
    if (this.isSelected(x)) {
      return false;
    } else {
      this.selected.push(typeof x === "string" ? x : x.uid);
      return true;
    }
  }

  removeSelected(x: InteractiveEntity | string): boolean {
    let index = typeof x === "string" ? this.selected.indexOf(x) : this.selected.indexOf(x.uid);
    if (index !== -1) {
      this.selected.splice(index, 1);
      return true;
    } else {
      return false;
    }
  }
}

let app = new MainApp();

export interface AppProps {
  paths: Path[];
  cc: CanvasConfig;
  ub: UserBehavior;

  app: MainApp;
}

const App = observer(() => {
  useTimer(1000 / 30);

  const [format, setFormat] = useState<Format>(new PathDotJerryioFormatV0_1());

  const [userBehavior, setUserBehavior] = useState(new UserBehavior());

  const cc = new CanvasConfig(window.innerHeight * 0.94, window.innerHeight * 0.94, 365.76, 365.76);

  function onKeyDown(event: KeyboardEvent) {
    let isCtrl = event.ctrlKey || event.metaKey;
    let isShift = event.shiftKey;
    setUserBehavior((ub) => ({ ...ub, isPressingCtrl: isCtrl, isPressingShift: isShift }));
  }

  function onKeyUp(event: KeyboardEvent) {
    let isCtrl = event.ctrlKey || event.metaKey;
    let isShift = event.shiftKey;
    setUserBehavior((ub) => ({ ...ub, isPressingCtrl: isCtrl, isPressingShift: isShift }));
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    // setUserControl({ ...userControl, mouseX: event.offsetX, mouseY: event.offsetY });
  }

  function initFormat() {
    if (format.isInit) return;

    format.init();

    app.gc = format.buildGeneralConfig();
    app.sc = format.buildSpeedConfig();
  }

  useEffect(action(() => {
    document.body.addEventListener('keydown', onKeyDown);
    document.body.addEventListener('keyup', onKeyUp);

    return () => {
      document.body.removeEventListener('keydown', onKeyDown);
      document.body.removeEventListener('keyup', onKeyUp);
    }
  }), []);

  useEffect(action(() => {
    initFormat();

    const disposer = reaction(() => app.gc.uol, action((newUOL: UnitOfLength, oldUOL: UnitOfLength) => {
      const con = new UnitConverter(oldUOL, newUOL);

      app.selected = [];
      app.expanded = [];

      app.gc.robotWidth = con.fromAtoB(app.gc.robotWidth);
      app.gc.robotHeight = con.fromAtoB(app.gc.robotHeight);

      // TODO set more stuff?

      for (let path of app.paths) {
        for (let control of path.getControlsSet()) {
          control.x = con.fromAtoB(control.x);
          control.y = con.fromAtoB(control.y);
        }
      }
    }));

    return () => {
      disposer();
    }
  }), [format]);

  useEffect(action(initFormat), [format]);

  const appProps: AppProps = { paths: app.paths, cc, ub: userBehavior, app };

  // XXX: set key so that the component will be reset when format is changed or app.gc.uol is changed
  return (
    <div className='App' key={format.uid + "-" + app.gc.uol}>
      <Card className='field-container' onMouseMove={onMouseMove}>
        <FieldCanvasElement {...appProps} />
      </Card>

      <Box className='editor-container'>
        <GeneralConfigAccordion gc={app.gc} format={format} setFormat={setFormat} />
        <SpeedConfigAccordion sc={app.sc} />
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Output</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Button variant="text">Save</Button>
              <Button variant="text">Save As</Button>
              <Button variant="text">Open</Button>
              <Button variant="text">Download</Button>
            </Box>
          </AccordionDetails>
        </Accordion>
        <PathsAccordion {...appProps} />
      </Box>
    </div>
  );
});

export default App;
