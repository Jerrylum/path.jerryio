import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AppProps } from '../App';
import { EndPointControl } from '../math/Path';
import { ObserverInput, parseNumberInString } from './ObserverInput';
import { NumberInUnit, UnitOfLength } from '../math/Unit';
import { makeId } from './Util';
import { UpdateInteractiveEntities } from '../math/Command';

const ControlAccordion = observer((props: AppProps) => {
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Control</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box id='control-editor'>
          <Box className='flex-editor-panel'>
            <ObserverInput
              label="X"
              getValue={() => {
                if (props.app.selectedEntityCount === 0) return "";
                if (props.app.selectedEntityCount > 1) return "(mixed)";
                const control = props.app.selectedControl;
                if (control === undefined) return "";
                return control.x.toString();
              }}
              setValue={(value: string) => {
                if (props.app.selectedEntityCount !== 1) return;
                const control = props.app.selectedControl;
                if (control === undefined) return;

                const controlUid = control.uid;
                const finalVal = parseNumberInString(
                  value,
                  props.app.gc.uol,
                  new NumberInUnit(-1000, UnitOfLength.Centimeter),
                  new NumberInUnit(1000, UnitOfLength.Centimeter)
                );

                props.app.history.execute(`Update control ${controlUid} x value`, 
                  new UpdateInteractiveEntities([control], {x: finalVal}));
              }}
              isValidIntermediate={(candidate: string) => candidate === "" || new RegExp(/^-?[0-9]*(\.[0-9]*)?$/g).test(candidate)}
              isValidValue={(candidate: string) => new RegExp(/^-?[0-9]*(\.[0-9]*)?$/g).test(candidate)}
              disabled={props.app.selectedEntityCount !== 1 || props.app.selectedControl === undefined}
              numeric
            />
            <ObserverInput
              label="Y"
              getValue={() => {
                if (props.app.selectedEntityCount === 0) return "";
                if (props.app.selectedEntityCount > 1) return "(mixed)";
                const control = props.app.selectedControl;
                if (control === undefined) return "";
                return control.y.toString();
              }}
              setValue={(value: string) => {
                if (props.app.selectedEntityCount !== 1) return;
                const control = props.app.selectedControl;
                if (control === undefined) return;

                const controlUid = control.uid;
                const finalVal = parseNumberInString(
                  value,
                  props.app.gc.uol,
                  new NumberInUnit(-1000, UnitOfLength.Centimeter),
                  new NumberInUnit(1000, UnitOfLength.Centimeter)
                );

                props.app.history.execute(`Update control ${controlUid} y value`,
                  new UpdateInteractiveEntities([control], {y: finalVal}));
              }}
              isValidIntermediate={(candidate: string) => candidate === "" || new RegExp(/^-?[0-9]*(\.[0-9]*)?$/g).test(candidate)}
              isValidValue={(candidate: string) => new RegExp(/^-?[0-9]*(\.[0-9]*)?$/g).test(candidate)}
              disabled={props.app.selectedEntityCount !== 1 || props.app.selectedControl === undefined}
              numeric
            />
            <ObserverInput
              label="Heading"
              getValue={() => {
                if (props.app.selectedEntityCount === 0) return "";
                if (props.app.selectedEntityCount > 1) return "(mixed)";
                const control = props.app.selectedControl;
                if (!(control instanceof EndPointControl)) return "";
                return control.heading.toString();
              }}
              setValue={(value: string) => {
                if (props.app.selectedEntityCount !== 1) return;
                const control = props.app.selectedControl;
                if (!(control instanceof EndPointControl)) return;

                const controlUid = control.uid;
                const finalVal = parseFloat(parseFloat(value).toFixed(3));

                props.app.history.execute(`Update control ${controlUid} heading value`,
                  new UpdateInteractiveEntities([control], {heading: finalVal}));
              }}
              isValidIntermediate={(candidate: string) => candidate === "" || new RegExp(/^-?[0-9]*(\.[0-9]*)?$/g).test(candidate)}
              isValidValue={(candidate: string) => new RegExp(/^-?[0-9]*(\.[0-9]*)?$/g).test(candidate)}
              disabled={props.app.selectedEntityCount !== 1 || props.app.selectedControl === undefined}
              sx={{ visibility: props.app.selectedEntityCount === 1 && !(props.app.selectedControl instanceof EndPointControl) ? "hidden" : "" }}
              numeric
            />
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  )
});

export { ControlAccordion };
