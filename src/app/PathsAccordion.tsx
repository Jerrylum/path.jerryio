import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Accordion, AccordionDetails, AccordionSummary, Button, TextField, Typography } from "@mui/material";
import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { TreeView } from '@mui/lab';
import App, { AppProps } from '../App';
import { Control, EndPointControl, Path, Spline } from '../math/Path';
import { useRef } from 'react';
import { PathTreeItem } from './PathTreeItem';
import { ObserverInput, parseNumberInString } from './ObserverInput';
import { NumberInUnit, UnitOfLength } from '../math/Unit';

const PathsAccordion = observer((props: AppProps) => {
  function onAddPathClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    props.paths.push(new Path(new Spline(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0))));
  }

  function onExpandAllClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    props.app.expanded = props.app.expanded.length !== props.paths.length ? props.paths.map((path) => path.uid) : [];
  }

  function onTreeViewNodeToggle(event: React.SyntheticEvent, nodeIds: string[]) {
    event.persist()
    // UX: Expand/Collapse if: the icon is clicked
    let iconClicked = (event.target as HTMLElement).closest(".MuiTreeItem-iconContainer")
    if (iconClicked) {
      props.app.expanded = nodeIds;
    }
  }

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Paths</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <div className='path-editor'>
          <div className='flex-editor-panel'>
            <ObserverInput
              label="X"
              getValue={() => {
                if (props.app.selected.length === 0) return "";
                if (props.app.selected.length > 1) return "(mixed)";
                const control = props.app.selectedControl;
                if (control === undefined) return "";
                return control.x.toString();
              }}
              setValue={(value: string) => {
                if (props.app.selected.length !== 1) return;
                const control = props.app.selectedControl;
                if (control === undefined) return;

                control.x = parseNumberInString(value, props.app.gc.uol,
                  new NumberInUnit(-1000, UnitOfLength.Centimeter), new NumberInUnit(1000, UnitOfLength.Centimeter))
              }}
              isValidIntermediate={(candidate: string) => candidate === "" || new RegExp(/^-?[0-9]+(\.[0-9]*)?$/g).test(candidate)}
              isValidValue={(candidate: string) => new RegExp(/^-?[0-9]+(\.[0-9]*)?$/g).test(candidate)}
              disabled={props.app.selected.length !== 1}
              numeric
            />
            <ObserverInput
              label="Y"
              getValue={() => {
                if (props.app.selected.length === 0) return "";
                if (props.app.selected.length > 1) return "(mixed)";
                const control = props.app.selectedControl;
                if (control === undefined) return "";
                return control.y.toString();
              }}
              setValue={(value: string) => {
                if (props.app.selected.length !== 1) return;
                const control = props.app.selectedControl;
                if (control === undefined) return;

                control.y = parseNumberInString(value, props.app.gc.uol,
                  new NumberInUnit(-1000, UnitOfLength.Centimeter), new NumberInUnit(1000, UnitOfLength.Centimeter))
              }}
              isValidIntermediate={(candidate: string) => candidate === "" || new RegExp(/^-?[0-9]+(\.[0-9]*)?$/g).test(candidate)}
              isValidValue={(candidate: string) => new RegExp(/^-?[0-9]+(\.[0-9]*)?$/g).test(candidate)}
              disabled={props.app.selected.length !== 1}
              numeric
            />
            <ObserverInput
              label="Heading"
              getValue={() => {
                if (props.app.selected.length === 0) return "";
                if (props.app.selected.length > 1) return "(mixed)";
                const control = props.app.selectedControl;
                if (!(control instanceof EndPointControl)) return "";
                return control.heading.toString();
              }}
              setValue={(value: string) => {
                if (props.app.selected.length !== 1) return;
                const control = props.app.selectedControl;
                if (!(control instanceof EndPointControl)) return;
                
                control.heading = parseFloat(value);
                control.fixPrecision();
              }}
              isValidIntermediate={(candidate: string) => candidate === "" || new RegExp(/^-?[0-9]+(\.[0-9]*)?$/g).test(candidate)}
              isValidValue={(candidate: string) => new RegExp(/^-?[0-9]+(\.[0-9]*)?$/g).test(candidate)}
              disabled={props.app.selected.length !== 1}
              sx={{ visibility: props.app.selected.length === 1 && !(props.app.selectedControl instanceof EndPointControl) ? "hidden" : "" }}
              numeric
            />
          </div>
          <div style={{ marginTop: "1vh" }}>
            <Button variant="text" onClick={action(onAddPathClick)}>Add Path</Button>
            {
              props.paths.length > 0
                ? <Button variant="text" onClick={action(onExpandAllClick)}>{props.app.expanded.length !== props.paths.length ? "Expand All" : "Collapse All"}</Button>
                : null
            }
          </div>
        </div>
        <TreeView
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
          multiSelect
          expanded={props.app.expanded}
          selected={props.app.selected}
          onNodeSelect={action((event, nodeIds) => props.app.selected = nodeIds)}
          onNodeToggle={action(onTreeViewNodeToggle)}
          sx={{ flexGrow: 1, maxWidth: "100%", overflowX: 'hidden', overflowY: 'auto', margin: "1vh 0 0" }}
        >
          {
            props.paths.slice().sort((a, b) => (a.name < b.name ? -1 : 1)).map((path, pathIdx) => {
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
