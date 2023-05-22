import { useEffect, useState } from 'react';
import './App.css';

import { Path, Vertex, InteractiveEntity } from './math/path';
import { CanvasConverter } from './math/shape';

import { reaction, action, makeAutoObservable } from "mobx"

import { observer } from "mobx-react-lite"

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { Box, Button } from '@mui/material';
import { SpeedConfig, SpeedConfigAccordion } from './app/SpeedControlAccordion';
import { PathsAccordion } from './app/PathsAccordion';
import { FieldCanvasElement } from './app/FieldCanvasElement';
import { useTimer } from './app/Util';
import { GeneralConfig, GeneralConfigAccordion, UnitConverter, UnitOfLength } from './app/GeneralConfigAccordion';
import { Format } from './math/format';
import { PathDotJerryioFormatV0_1 } from './math/PathDotJerryioFormatV0_1';

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

function addToArray<T>(array: T[], item: T): boolean {
  if (array.includes(item)) {
    return false;
  } else {
    array.push(item);
    return true;
  }
}

function removeFromArray<T>(array: T[], item: T): boolean {
  let index = array.indexOf(item);
  if (index !== -1) {
    array.splice(index, 1);
    return true;
  } else {
    return false;
  }
}

// observable class
class MainApp {
  public gc: GeneralConfig = new GeneralConfig(); // a.k.a Configuration
  public sc: SpeedConfig = new SpeedConfig(); // a.k.a Speed Control

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

  function onDownload() {
    const output = format.exportPathFile(app.paths, app.gc, app.sc);
    if (output === undefined) {
      alert("Error: Cannot export path file"); // TODO better error handling
      return;
    }
    const a = document.createElement("a");
    const file = new Blob([output], { type: "text/plain" });
    a.href = URL.createObjectURL(file);
    a.download = "path.jerryio.txt";
    a.click();
  }

  // XXX: set key so that the component will be reset when format is changed or app.gc.uol is changed
  return (
    <div className='App' key={format.uid + "-" + app.gc.uol}>
      <Card className='field-container'>
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
              <Button variant="text" onClick={onDownload}>Download</Button>
            </Box>
          </AccordionDetails>
        </Accordion>
        <PathsAccordion {...appProps} />
      </Box>
    </div>
  );
});

export default App;
