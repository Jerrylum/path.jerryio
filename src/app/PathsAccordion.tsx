import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Accordion, AccordionDetails, AccordionSummary, Button, Slider, TextField, Typography } from "@mui/material";
import { runInAction, makeAutoObservable } from "mobx"
import { observer } from "mobx-react-lite";
import { TreeView } from '@mui/lab';
import { AppProps } from '../App';
import { Control, EndPointControl, Path, Spline } from '../math/path';
import { useRef } from 'react';
import { PathTreeItem } from './PathTreeItem';

export class ControlEditorData {
  static readonly MultiSelect: unique symbol = Symbol("multi select");

  private xInput: string = "";
  private yInput: string = "";
  private headingInput: string = "";
  private selected: EndPointControl | Control | Symbol | undefined;

  public xInputRef = useRef<HTMLInputElement>(null);
  public yInputRef = useRef<HTMLInputElement>(null);
  public headingInputRef = useRef<HTMLInputElement>(null);

  constructor(xInputRef: React.RefObject<HTMLInputElement>, yInputRef: React.RefObject<HTMLInputElement>, headingInputRef: React.RefObject<HTMLInputElement>) {
    this.xInputRef = xInputRef;
    this.yInputRef = yInputRef;
    this.headingInputRef = headingInputRef;
  }

  getSelected() {
    return this.selected;
  }

  setSelected(selected: EndPointControl | Control | Symbol | undefined) {
    if (selected !== this.selected) {
      this.selected = selected;
      if (selected instanceof Control) {
        this.xInput = selected.x.toString();
        this.yInput = selected.y.toString();
        if (selected instanceof EndPointControl) {
          this.headingInput = selected.heading.toString();
        } else {
          this.headingInput = "";
        }
      } else if (selected === undefined) {
        this.xInput = "";
        this.yInput = "";
        this.headingInput = "";
      } else {
        this.xInput = "(mixed)";
        this.yInput = "(mixed)";
        this.headingInput = "(mixed)";
      }
      this.xInputRef.current!.value = this.xInput;
      this.yInputRef.current!.value = this.yInput;
      this.headingInputRef.current!.value = this.headingInput;
    }
  }

  setXInput(x: string) {
    if (x !== this.xInput) {
      this.xInput = x;
      this.xInputRef.current!.value = x;
    }
  }

  setYInput(y: string) {
    if (y !== this.yInput) {
      this.yInput = y;
      this.yInputRef.current!.value = y;
    }
  }

  setHeadingInput(heading: string) {
    if (heading !== this.headingInput) {
      this.headingInput = heading;
      this.headingInputRef.current!.value = heading;
    }
  }

  writeBack() {
    if (!(this.selected instanceof Control)) return;

    let x = parseFloat(this.xInputRef.current!.value);
    let y = parseFloat(this.yInputRef.current!.value);
    let heading = parseFloat(this.headingInputRef.current!.value);

    if (!isNaN(x)) {
      this.selected.x = x;
      this.xInputRef.current!.value = x.toString();
    } else {
      this.xInputRef.current!.value = this.selected.x.toString();
    }
    if (!isNaN(y)) {
      this.selected.y = y;
      this.yInputRef.current!.value = y.toString();
    } else {
      this.yInputRef.current!.value = this.selected.y.toString();
    }
    if (this.selected instanceof EndPointControl) {
      if (!isNaN(heading)) {
        this.selected.heading = heading;
        this.headingInputRef.current!.value = heading.toString();
      } else {
        this.headingInputRef.current!.value = this.selected.heading.toString();
      }
    }
    this.selected.fixPrecision();
  }
}

const PathsAccordion = observer((props: AppProps) => {
  function onAddPathClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    props.paths.push(new Path(new Spline(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0))));
  }

  function onExpandAllClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    props.setExpanded((expanded) => expanded.length !== props.paths.length ? props.paths.map((path) => path.uid) : []);
  }

  function onControlEditorInputConfirm(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.code === "Enter" || event.code === "NumpadEnter") controlEditor.current.writeBack();
  }

  function onControlEditorInputTabConfirm(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.code === "Tab") controlEditor.current.writeBack();
  }

  function onTreeViewNodeToggle(event: React.SyntheticEvent, nodeIds: string[]) {
    event.persist()
    // only expand if icon was clicked
    let iconClicked = (event.target as HTMLElement).closest(".MuiTreeItem-iconContainer")
    if (iconClicked) {
      props.setExpanded(nodeIds);
    }
  }

  const controlEditor = useRef<ControlEditorData>(new ControlEditorData(
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ));

  let xDisabled = true, yDisabled = true, headingDisabled = true, headingHide = false;
  let currentCED = controlEditor.current;

  if (props.selected.length > 1) {
    currentCED.setSelected(ControlEditorData.MultiSelect);
  } else if (props.selected.length === 1) {
    let firstSelected = props.paths.map(
      (path) => path.getControlsSet().find((control) => control.uid === props.selected[0])
    ).find((control) => control !== undefined);
    currentCED.setSelected(firstSelected);
    if (firstSelected !== undefined) {
      currentCED.setXInput(firstSelected.x.toString());
      currentCED.setYInput(firstSelected.y.toString());
      xDisabled = false;
      yDisabled = false;
      if (firstSelected instanceof EndPointControl) {
        currentCED.setHeadingInput((firstSelected as EndPointControl).heading.toString());
        headingDisabled = false;
      } else {
        headingHide = true;
      }
    }
  } else {
    currentCED.setSelected(undefined);
  }

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Paths</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <div className='path-editor' onKeyDown={onControlEditorInputTabConfirm}>
          <div className='flex-editor-panel'>
            <TextField
              label="X"
              id="outlined-size-small"
              InputLabelProps={{ shrink: true }}
              size="small"
              inputRef={controlEditor.current.xInputRef}
              onKeyUp={onControlEditorInputConfirm}
              disabled={xDisabled}
            />
            <TextField
              label="Y"
              id="outlined-size-small"
              InputLabelProps={{ shrink: true }}
              size="small"
              inputRef={controlEditor.current.yInputRef}
              onKeyUp={onControlEditorInputConfirm}
              disabled={yDisabled}
            />
            <TextField
              label="Heading"
              id="outlined-size-small"
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ display: headingHide ? "none" : "" }}
              inputRef={controlEditor.current.headingInputRef}
              onKeyUp={onControlEditorInputConfirm}
              disabled={headingDisabled}
            />
          </div>
          <div style={{ marginTop: "1vh" }}>
            <Button variant="text" onClick={onAddPathClick}>Add Path</Button>
            {
              props.paths.length > 0
                ? <Button variant="text" onClick={onExpandAllClick}>{props.expanded.length !== props.paths.length ? "Expand All" : "Collapse All"}</Button>
                : null
            }
          </div>
        </div>
        <TreeView
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
          multiSelect
          expanded={props.expanded}
          selected={props.selected}
          onNodeSelect={(event, nodeIds) => props.setSelected(nodeIds)}
          onNodeToggle={onTreeViewNodeToggle}
          sx={{ flexGrow: 1, maxWidth: "100%", overflowX: 'hidden', overflowY: 'auto', margin: "1vh 0 0" }}
        >
          {
            props.paths.sort((a, b) => (a.name < b.name ? -1 : 1)).map((path, pathIdx) => {
              return (
                <PathTreeItem key={path.uid} path={path} {...props} />
              )
            })
          }
        </TreeView>
      </AccordionDetails>
    </Accordion>
  )
});

export { PathsAccordion };
