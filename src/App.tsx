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

export interface AppProps {
  paths: Path[];
  cc: CanvasConfig;
  ub: UserBehavior;
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  expanded: string[];
  setExpanded: React.Dispatch<React.SetStateAction<string[]>>;
  magnet: Vertex;
  setMagnet: React.Dispatch<React.SetStateAction<Vertex>>;
}

let app = observable({
  general: new GeneralConfig(), // a.k.a Configuration
  speed: new SpeedConfig(), // a.k.a Speed Control
})

const App = observer(() => {
  useTimer(1000 / 30);

  const [format, setFormat] = useState<Format>(new PathDotJerryioFormatV0_1());


  const paths = useMemo<Path[]>(() => [], []);

  const [userBehavior, setUserBehavior] = useState(new UserBehavior());

  const [expanded, setExpanded] = useState<string[]>([]);

  const [selected, setSelected] = useState<string[]>([]);

  const [magnet, setMagnet] = useState<Vertex>(new Vertex(Infinity, Infinity));

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
    console.log("format changed", format);

    if (format.isInit) return;

    format.init();

    app.general = format.buildGeneralConfig();
    app.speed = format.buildSpeedConfig();

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

    const disposer = reaction(() => app.general.uol, action((newUOL: UnitOfLength, oldUOL: UnitOfLength) => {
      const con = new UnitConverter(oldUOL, newUOL);

      app.general.robotWidth = con.fromAtoB(app.general.robotWidth);
      app.general.robotHeight = con.fromAtoB(app.general.robotHeight);

      console.log(app.general.robotHeight);

    }));

    return () => {
      disposer();
    }
  }), [format]);

  useEffect(action(initFormat), [format]);

  const appProps: AppProps = { paths, cc, ub: userBehavior, selected, setSelected, expanded, setExpanded, magnet, setMagnet };

  // XXX: set key so that the component will be re-set when format is changed or app.general.uol is changed
  return (
    <div className='App' key={format.uid + "-" + app.general.uol}>
      <Card className='field-container' onMouseMove={onMouseMove}>
        <FieldCanvasElement {...appProps} />
      </Card>

      <Box className='editor-container'>
        <GeneralConfigAccordion gc={app.general} format={format} setFormat={setFormat} />
        <SpeedConfigAccordion sc={app.speed} />
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
