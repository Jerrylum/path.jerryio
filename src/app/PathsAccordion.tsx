import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Button, Typography } from "@mui/material";
import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { AppProps } from '../App';
import { EndPointControl, Path, Spline } from '../math/Path';
import { ObserverInput, parseNumberInString } from './ObserverInput';
import { NumberInUnit, UnitOfLength } from '../math/Unit';

const PathsAccordion = observer((props: AppProps) => {
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Edit</Typography>
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
              disabled={props.app.selected.length !== 1 || props.app.selectedControl === undefined}
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
              disabled={props.app.selected.length !== 1 || props.app.selectedControl === undefined}
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
              disabled={props.app.selected.length !== 1 || props.app.selectedControl === undefined}
              sx={{ visibility: props.app.selected.length === 1 && !(props.app.selectedControl instanceof EndPointControl) ? "hidden" : "" }}
              numeric
            />
          </div>
        </div>
      </AccordionDetails>
    </Accordion>
  )
});

export { PathsAccordion };
