import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

import Card from '@mui/material/Card';

import { Control, EndPointControl, Spline, Path, Vertex } from './math/path';
import { CanvasConfig } from './math/shape';
import Konva from 'konva';
import { Circle, Layer, Rect, Stage, Image, Line } from 'react-konva';

import fieldImageUrl from './static/field2023.png'
import useImage from 'use-image';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import Typography from '@mui/material/Typography';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextField from '@mui/material/TextField';
import TreeView from '@mui/lab/TreeView';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TreeItem from '@mui/lab/TreeItem';

import { Input } from '@mui/icons-material';

class UserControl {
  public isPressingCtrl: boolean = false;
  public isPressingShift: boolean = false;
  public mouseX: number = 0;
  public mouseY: number = 0;
}

interface SplineElementProps {
  spline: Spline;
  path: Path;
  cc: CanvasConfig;
  uc: UserControl;
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
}

interface SplineControlElementProps extends SplineElementProps {
  cp: EndPointControl | Control;
}


function useTimer(ms: number) {
  const [time, setTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), ms);
    return () => {
      clearInterval(interval);
    };
  }, [ms]);

  return time;
}

function SplineControlVisualLineElement(props: { start: Vertex, end: Vertex, cc: CanvasConfig }) {
  const startInPx = props.cc.toPx(props.start);
  const endInPx = props.cc.toPx(props.end);

  const line_width = props.cc.pixelWidth / 600;

  return (
    <Line points={[startInPx.x, startInPx.y, endInPx.x, endInPx.y]} stroke="ffffff" strokeWidth={line_width} opacity={0.25} />
  )
}

function SplineKnotsHitBoxElement(props: SplineElementProps) {
  function onLineClick(event: Konva.KonvaEventObject<MouseEvent>) {
    let evt = event.evt;

    let cpInPx = new EndPointControl(evt.offsetX, evt.offsetY, 0);
    let cpInCm = props.cc.toCm(cpInPx);

    if (evt.button === 2) { // click
      props.path.splitSpline(props.spline, cpInCm);
    } else {
      if (props.spline.controls.length === 2)
        props.path.changeTo4ControlsCurve(props.spline);
      else
        props.path.changeToLine(props.spline);
    }
  }

  let points: number[] = [];

  for (let cp of props.spline.controls) {
    let cpInPx = props.cc.toPx(cp);
    points.push(cpInPx.x);
    points.push(cpInPx.y);
  }

  const knot_width = props.cc.pixelWidth / 320 * 2.5;

  return (
    <Line points={points} strokeWidth={knot_width} stroke={"red"} opacity={0} bezier={props.spline.controls.length > 2} onClick={onLineClick} />
  )
}

function SplineControlElement(props: SplineControlElementProps) {
  const [justSelected, setJustSelected] = useState(false);

  function onMouseDownControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;
    if (evt.button === 0) { // left click
      setJustSelected(false);
      if (props.uc.isPressingShift) {
        // add if not
        props.setSelected((selected) => {
          if (selected.includes(props.cp.uid)) {
            return selected;
          } else {
            setJustSelected(true);
            return [...selected, props.cp.uid];
          }
        });
      } else {
        // set selection to this control point
        props.setSelected([props.cp.uid]);
      }
    }
  }

  function onClickControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;
    if (evt.button === 0) { // left click
      if (props.uc.isPressingShift) {
        // remove if already selected and it is not being added recently
        props.setSelected((selected) => {
          if (selected.includes(props.cp.uid) && !justSelected) {
            return selected.filter((uid) => uid !== props.cp.uid);
          } else {
            return selected;
          }
        });
      }
    }
  }

  function onDragControlPoint(event: Konva.KonvaEventObject<DragEvent>) {
    const evt = event.evt;

    const oldCpInCm = props.cp.clone();

    let cpInPx = new Vertex(evt.offsetX, evt.offsetY);
    let cpInCm = props.cc.toCm(cpInPx);
    props.cp.x = cpInCm.x;
    props.cp.y = cpInCm.y;

    // CP 1 should follow CP 0, CP 2 should follow CP 3
    const isMainControl = props.cp instanceof EndPointControl;
    const shouldFollow = isMainControl && !props.uc.isPressingCtrl;
    const index = props.path.splines.indexOf(props.spline);
    const isLastOne = index + 1 === props.path.splines.length;
    const isCurve = props.spline.controls.length === 4;
    const isFirstCp = props.spline.first() === props.cp;

    let partner0: Vertex | null = null;
    let partner1: Vertex | null = null;
    if (isCurve && shouldFollow) {
      partner0 = isFirstCp ? props.spline.controls[1] : props.spline.controls[2];

    }
    if (!isLastOne && !isFirstCp && shouldFollow) {
      const nextSpline = props.path.splines[index + 1];
      if (nextSpline.controls.length === 4) {
        partner1 = nextSpline.controls[1];
      }
    }

    if (props.uc.isPressingShift) {
      let magnetX = cpInCm.x;
      let magnetXDistance = Infinity;
      let magnetY = cpInCm.y;
      let magnetYDistance = Infinity;

      for (let spline of props.path.splines) {
        for (let cp of spline.controls) {
          if (cp === props.cp || cp === partner0 || cp === partner1) continue;

          let distance = cp.distance(cpInCm);
          if (Math.abs(cp.x - cpInCm.x) < props.cc.controlPointMagnetDistance && distance < magnetXDistance) {
            magnetX = cp.x;
            magnetXDistance = distance;
          }
          if (Math.abs(cp.y - cpInCm.y) < props.cc.controlPointMagnetDistance && distance < magnetYDistance) {
            magnetY = cp.y;
            magnetYDistance = distance;
          }
        }
      }

      cpInCm.x = magnetX;
      cpInCm.y = magnetY;
    }

    if (partner0) {
      const newPartner = cpInCm.add(partner0.subtract(oldCpInCm));
      partner0.x = newPartner.x;
      partner0.y = newPartner.y;
    }
    if (partner1) {
      const newPartner = cpInCm.add(partner1.subtract(oldCpInCm));
      partner1.x = newPartner.x;
      partner1.y = newPartner.y;
    }

    props.cp.x = cpInCm.x;
    props.cp.y = cpInCm.y;
    cpInPx = props.cc.toPx(cpInCm);
    event.target.x(cpInPx.x);
    event.target.y(cpInPx.y);
  }

  function onWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    let evt = event.evt;

    let epc = props.cp as EndPointControl;
    epc.heading += evt.deltaY / 10;
    epc.heading %= 360;
    if (epc.heading < 0) epc.heading += 360;
  }

  const lineWidth = props.cc.pixelWidth / 600;
  const cpRadius = props.cc.pixelWidth / 40;
  const cpInPx = props.cc.toPx(props.cp);
  const fillColor = props.selected.includes(props.cp.uid) ? "#0000ff4f" : "#0000ff2f";
  const isMainControl = props.cp instanceof EndPointControl;

  function onClickFirstOrLastControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    let evt = event.evt;

    onClickControlPoint(event);
    if (evt.button === 2) { // right click
      props.path.removeSplineByFirstOrLastControlPoint(props.cp as EndPointControl);
    }
  }

  return (
    <>
      {
        isMainControl ? (
          <>
            <Line points={[
              cpInPx.x, cpInPx.y,
              cpInPx.x + Math.sin(-((cpInPx as EndPointControl).headingInRadian() - Math.PI)) * cpRadius,
              cpInPx.y + Math.cos(-((cpInPx as EndPointControl).headingInRadian() - Math.PI)) * cpRadius
            ]} stroke="ffffff" strokeWidth={lineWidth} />
            <Circle x={cpInPx.x} y={cpInPx.y} radius={cpRadius} fill={fillColor}
              draggable onDragMove={onDragControlPoint} onMouseDown={onMouseDownControlPoint} onWheel={onWheel} onClick={onClickFirstOrLastControlPoint} />
          </>
        ) : (
          <Circle x={cpInPx.x} y={cpInPx.y} radius={cpRadius / 2} fill={fillColor}
            draggable onDragMove={onDragControlPoint} onMouseDown={onMouseDownControlPoint} />
        )
      }

    </>
  )
}

function SplineElement(props: SplineElementProps) {
  let isFirstSpline = props.path.splines[0] === props.spline;

  let knotRadius = props.cc.pixelWidth / 320;

  return (
    <>
      {props.spline.calculateKnots(props.cc).map((knotInCm, index) => {
        let knotInPx = props.cc.toPx(knotInCm);
        return (
          <Circle key={index} x={knotInPx.x} y={knotInPx.y} radius={knotRadius} fill="#00ff00ff" />
        )
      })}
      {
        props.spline.controls.length === 4 ? (
          <>
            <SplineControlVisualLineElement start={props.spline.controls[0]} end={props.spline.controls[1]} cc={props.cc} />
            <SplineControlVisualLineElement start={props.spline.controls[2]} end={props.spline.controls[3]} cc={props.cc} />
          </>
        ) : null
      }
      <SplineKnotsHitBoxElement {...props} />
      {props.spline.controls.map((cpInCm, index) => {
        if (!isFirstSpline && index === 0) return null;
        return (
          <SplineControlElement key={index} {...props} cp={cpInCm} />
        )
      })}
    </>
  )
}

function App() {
  useTimer(1000 / 30);

  const paths = useMemo(() => [new Path(new Spline(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0)))], []);

  const [userControl, setUserControl] = useState(new UserControl());

  const [selected, setSelected] = useState<string[]>([]);

  const [fieldImage] = useImage(fieldImageUrl);

  const cc = new CanvasConfig(window.innerHeight * 0.94, window.innerHeight * 0.94, 365.76, 365.76);

  function onClickFieldImage(event: Konva.KonvaEventObject<MouseEvent>) {
    let evt = event.evt;

    if (evt.button === 2) { // click
      paths[0].addLine(cc.toCm(new EndPointControl(evt.offsetX, evt.offsetY, 0)));
    } else {
      paths[0].add4ControlsCurve(cc.toCm(new EndPointControl(evt.offsetX, evt.offsetY, 0)));
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let isCtrl = event.ctrlKey || event.metaKey;
    let isShift = event.shiftKey;
    setUserControl({ ...userControl, isPressingCtrl: isCtrl, isPressingShift: isShift });

  }

  function onKeyUp(event: React.KeyboardEvent<HTMLDivElement>) {
    let isCtrl = event.ctrlKey || event.metaKey;
    let isShift = event.shiftKey;
    setUserControl({ ...userControl, isPressingCtrl: isCtrl, isPressingShift: isShift });
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    // setUserControl({ ...userControl, mouseX: event.offsetX, mouseY: event.offsetY });
  }

  function onPathNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    // paths[selectedPath].name = event.target.innerText;
  }

  return (
    <div className='App'>
      <Card className='field-container' tabIndex={1} onKeyDown={onKeyDown} onKeyUp={onKeyUp} onMouseMove={onMouseMove}>
        <Stage className='field-canvas' width={cc.pixelWidth} height={cc.pixelHeight} onContextMenu={(e) => e.evt.preventDefault()}>
          <Layer>
            <Image image={fieldImage} width={cc.pixelWidth} height={cc.pixelHeight} onClick={onClickFieldImage} />
            {
              paths.map((path, index) => {
                return (
                  <React.Fragment key={index}>
                    {path.splines.map((spline) => {
                      return (
                        <SplineElement key={spline.uid} {...{spline, path, cc, uc: userControl, selected, setSelected}} />
                      )
                    })}
                  </React.Fragment>
                )
              })
            }
          </Layer>
        </Stage>
      </Card>

      <div className='editor-container'>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Robot Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              label="Width"
              id="outlined-size-small"
              defaultValue="30"
              size="small"
              sx={{ marginBottom: "1vh", marginRight: "1vh" }}
            />
            <TextField
              label="Height"
              id="outlined-size-small"
              defaultValue="30"
              size="small"
            />
          </AccordionDetails>
        </Accordion>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Output</Typography>
          </AccordionSummary>
          <AccordionDetails>

          </AccordionDetails>
        </Accordion>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Paths</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TreeView
              defaultCollapseIcon={<ExpandMoreIcon />}
              defaultExpandIcon={<ChevronRightIcon />}
              multiSelect
              selected={selected}
              onNodeSelect={(event, nodeIds) => setSelected(nodeIds)}
              sx={{ flexGrow: 1, maxWidth: "100%", overflowX: 'hidden', overflowY: 'auto', marginBottom: "2vh" }}
            >
              {
                paths.map((path, pathIdx) => {
                  return (
                    <TreeItem nodeId={path.uid} key={path.uid} label={
                      <>
                        <span contentEditable
                          style={{ display: 'inline-block' }}
                          onInput={onPathNameChange}
                          suppressContentEditableWarning={true}
                        >{path.name}</span>
                      </>
                    } >
                      {
                        path.getControlsSet().map((control, controlIdx) => {
                          return (
                            <TreeItem nodeId={control.uid} key={control.uid} label={control instanceof EndPointControl ? "End Point Control" : "Control"} />
                          )
                        })
                      }
                    </TreeItem>
                  )
                })
              }
            </TreeView>

            <Typography>
              TODO

            </Typography>
          </AccordionDetails>
        </Accordion>
      </div>
    </div>
  );
}

export default App;
