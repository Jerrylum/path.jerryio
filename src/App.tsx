import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

import { Control, EndPointControl, Spline, Path, Vertex, InteractiveEntity } from './math/path';
import { CanvasConfig } from './math/shape';

import { reaction, runInAction, makeAutoObservable } from "mobx"
                  
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
import { GeneralConfig, GeneralConfigAccordion } from './app/GeneralConfigAccordion';

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

const gbGeneral = new GeneralConfig(); // a.k.a Configuration
const gbSpeed = new SpeedConfig(); // a.k.a Speed Control

const App = observer(() => {
  useTimer(1000 / 30);

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

  useEffect(() => {
    document.body.addEventListener('keydown', onKeyDown);
    document.body.addEventListener('keyup', onKeyUp);

    return () => {
      document.body.removeEventListener('keydown', onKeyDown);
      document.body.removeEventListener('keyup', onKeyUp);
    }
  }, []);

  useEffect(() => {
    reaction(() => gbGeneral.format, (format) => {
      console.log(format.getName());
      
    });
  }, []);

  const appProps: AppProps = { paths, cc, ub: userBehavior, selected, setSelected, expanded, setExpanded, magnet, setMagnet };

  return (
    <div className='App'>
      <Card className='field-container' onMouseMove={onMouseMove}>
        <FieldCanvasElement {...appProps} />
      </Card>

      <Box className='editor-container'>
        <GeneralConfigAccordion gc={gbGeneral} />
        <SpeedConfigAccordion sc={gbSpeed} />
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
