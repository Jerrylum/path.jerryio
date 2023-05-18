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
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable';

class UserControl {
  public isPressingCtrl: boolean = false;
  public isPressingShift: boolean = false;
  public mouseX: number = 0;
  public mouseY: number = 0;
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

function SplineControlPointVisualLineElement(props: { start: Vertex, end: Vertex, cc: CanvasConfig }) {
  const start_in_px = props.cc.toPx(props.start);
  const end_in_px = props.cc.toPx(props.end);

  const line_width = props.cc.pixelWidth / 600;

  return (
    <Line points={[start_in_px.x, start_in_px.y, end_in_px.x, end_in_px.y]} stroke="ffffff" strokeWidth={line_width} opacity={0.25} />
  )
}

function SplineKnotsHitBoxElement(props: { spline: Spline, path: Path, cc: CanvasConfig }) {
  function onLineClick(event: Konva.KonvaEventObject<MouseEvent>) {
    let evt = event.evt;

    let cpInPx = new EndPointControl(evt.offsetX, evt.offsetY, 0);
    let cpInCm = props.cc.toCm(cpInPx);

    if (evt.button === 2) { // click
      props.path.splitSpline(props.spline, cpInCm);
    } else {
      if (props.spline.control_points.length === 2)
        props.path.changeTo4ControlsCurve(props.spline);
      else
        props.path.changeToLine(props.spline);
    }
  }

  let points: number[] = [];

  for (let v of props.spline.control_points) {
    let v_in_px = props.cc.toPx(v);
    points.push(v_in_px.x);
    points.push(v_in_px.y);
  }

  const knot_width = props.cc.pixelWidth / 320 * 2.5;

  return (
    <Line points={points} strokeWidth={knot_width} stroke={"red"} opacity={0} bezier={props.spline.control_points.length > 2} onClick={onLineClick} />
  )
}

function SplineControlPointElement(props: { cp: Control, spline: Spline, path: Path, cc: CanvasConfig, uc: UserControl, isFirstOrLast: boolean }) {
  function onDragControlPoint(event: Konva.KonvaEventObject<DragEvent>) {
    const evt = event.evt;

    const oldCpInCm = props.cp.clone();

    let cpInPx = new Vertex(evt.offsetX, evt.offsetY);
    let cpInCm = props.cc.toCm(cpInPx);
    props.cp.x = cpInCm.x;
    props.cp.y = cpInCm.y;

    // CP 1 should follow CP 0, CP 2 should follow CP 3
    const shouldFollow = props.isFirstOrLast && !props.uc.isPressingCtrl;
    const index = props.path.splines.indexOf(props.spline);
    const isLastOne = index + 1 === props.path.splines.length;
    const isCurve = props.spline.control_points.length === 4;
    const isFirstCp = props.spline.first() === props.cp;

    let partner0: Vertex | null = null;
    let partner1: Vertex | null = null;
    if (isCurve && shouldFollow) {
      partner0 = isFirstCp ? props.spline.control_points[1] : props.spline.control_points[2];

    }
    if (!isLastOne && !isFirstCp && shouldFollow) {
      const nextSpline = props.path.splines[index + 1];
      if (nextSpline.control_points.length === 4) {
        partner1 = nextSpline.control_points[1];
      }
    }

    if (props.uc.isPressingShift) {
      let magnetX = cpInCm.x;
      let magnetXDistance = Infinity;
      let magnetY = cpInCm.y;
      let magnetYDistance = Infinity;

      for (let spline of props.path.splines) {
        for (let cp of spline.control_points) {
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

  const line_width = props.cc.pixelWidth / 600;
  const cp_radius = props.cc.pixelWidth / 40;
  const cp_in_px = props.cc.toPx(props.cp);

  function onClickFirstOrLastControlPoint(event: Konva.KonvaEventObject<MouseEvent>) {
    let evt = event.evt;

    if (evt.button === 2) { // right click
      props.path.removeSplineByFirstOrLastControlPoint(props.cp as EndPointControl);
    }
  }

  return (
    <>
      {
        props.isFirstOrLast ? (
          <>
            <Line points={[
              cp_in_px.x, cp_in_px.y,
              cp_in_px.x + Math.sin(-((cp_in_px as EndPointControl).headingInRadian() - Math.PI)) * cp_radius,
              cp_in_px.y + Math.cos(-((cp_in_px as EndPointControl).headingInRadian() - Math.PI)) * cp_radius
            ]} stroke="ffffff" strokeWidth={line_width} />
            <Circle x={cp_in_px.x} y={cp_in_px.y} radius={props.isFirstOrLast ? cp_radius : cp_radius / 2} fill="#0000ff2f"
              draggable onDragMove={onDragControlPoint} onWheel={onWheel} onClick={onClickFirstOrLastControlPoint} />
          </>
        ) : (
          <Circle x={cp_in_px.x} y={cp_in_px.y} radius={props.isFirstOrLast ? cp_radius : cp_radius / 2} fill="#0000ff2f"
            draggable onDragMove={onDragControlPoint} />
        )
      }

    </>
  )
}

function SplineElement(props: { spline: Spline, path: Path, cc: CanvasConfig, uc: UserControl }) {
  let isFirst = props.path.splines[0] === props.spline;

  let knot_radius = props.cc.pixelWidth / 320;

  return (
    <>
      {props.spline.calculateKnots(props.cc).map((knot_in_cm, index) => {
        let knot_in_px = props.cc.toPx(knot_in_cm);
        return (
          <Circle key={index} x={knot_in_px.x} y={knot_in_px.y} radius={knot_radius} fill="#00ff00ff" />
        )
      })}
      {
        props.spline.control_points.length === 4 ? (
          <>
            <SplineControlPointVisualLineElement start={props.spline.control_points[0]} end={props.spline.control_points[1]} cc={props.cc} />
            <SplineControlPointVisualLineElement start={props.spline.control_points[2]} end={props.spline.control_points[3]} cc={props.cc} />
          </>
        ) : null
      }
      <SplineKnotsHitBoxElement spline={props.spline} path={props.path} cc={props.cc} />
      {props.spline.control_points.map((cp_in_cm, index) => {
        if (!isFirst && index === 0) return null;
        return (
          <SplineControlPointElement key={index}
            cp={cp_in_cm} spline={props.spline} path={props.path} cc={props.cc} uc={props.uc}
            isFirstOrLast={cp_in_cm === props.spline.first() || cp_in_cm === props.spline.last()} />
        )
      })}
    </>
  )
}

function App() {
  useTimer(1000 / 30);

  const selectedPath = 0;

  const paths = useMemo(() => [new Path(new Spline(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0)))], []);

  const [userControl, setUserControl] = useState(new UserControl());

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
                        <SplineElement key={spline.uid} spline={spline} path={path} cc={cc} uc={userControl} />
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
              sx={{marginBottom: "1vh"}}
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
            <Typography>File</Typography>
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
              sx={{ flexGrow: 1, maxWidth: "100%", overflowX: 'hidden', overflowY: 'auto', marginBottom: "2vh" }}
            >
              {
                paths.map((path, pathIdx) => {
                  return (
                    <TreeItem nodeId={pathIdx + ""} label={
                      <>
                        {/* <ContentEditable style={{display:'inline-block'}} onChange={onPathNameChange} html={path.name}></ContentEditable>
                         */}
                         <span contentEditable
                          style={{display:'inline-block'}}
                          onInput={onPathNameChange}
                          suppressContentEditableWarning={true}
                         >{path.name}</span>
                      </>
                    } >
                      {
                        path.getControlsSet().map((control, controlIdx) => {
                          return (
                            <TreeItem nodeId={pathIdx + "," + controlIdx} label={control instanceof EndPointControl ? "End Point Control" : "Control"} />
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
