import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Checkbox, FormControlLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { runInAction, makeAutoObservable } from "mobx"
import { observer } from "mobx-react-lite";
import { Format } from '../math/format';
import { LemLibFormatV0_4 } from '../math/LemLibFormatV0_4';
import { PathDotJerryioFormatV0_1 } from '../math/PathDotJerryioFormatV0_1';
import { ObserverInput } from './ObserverInput';


export enum UnitOfLength {
  Millimeter = 1,
  Centimeter, // default
  Meter,
  Inch,
  Foot,
}

const ratioCentimeter = 1;
const ratioMillimeter = ratioCentimeter / 10;
const ratioMeter = 100 * ratioCentimeter; // SI base unit
const ratioInch = 2.54 * ratioCentimeter;
const ratioFoot = 12 * ratioInch;


// observable class
export class GeneralConfig {
  format: Format = new LemLibFormatV0_4();
  robotWidth: number = 30;
  robotHeight: number = 30;
  showRobot: boolean = true;
  uol: UnitOfLength = UnitOfLength.Centimeter;

  constructor() {
    makeAutoObservable(this);
  }
}

const GeneralConfigAccordion = observer((props: { gc: GeneralConfig }) => {

  const formats: Format[] = [
    new LemLibFormatV0_4(),
    new PathDotJerryioFormatV0_1(),
  ]

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Configuration</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography gutterBottom>Format</Typography>
        <Box className="panel-box">
          <Select size="small" sx={{ maxWidth: "100%" }}
            value={formats.findIndex((x) => x.getName() === props.gc.format.getName())}
            onChange={(e) => runInAction(() => props.gc.format = formats[parseInt(e.target.value + "")])}>
            {
              formats.map((x, i) => {
                return <MenuItem key={i} value={i}>{x.getName()}</MenuItem>
              })
            }
          </Select>
        </Box>
        <Typography sx={{ marginTop: "2vh" }} gutterBottom>Robot Visualize</Typography>
        <Box className='flex-editor-panel'>
          <ObserverInput
            label="Width"
            getValue={() => props.gc.robotWidth + ""}
            setValue={(value: string) => { props.gc.robotWidth = parseFloat(parseFloat(value).toFixed(3)); }}
            isValidIntermediate={(candidate: string) => candidate === "" || new RegExp(/^[0-9]+(\.[0-9]*)?$/g).test(candidate)}
            isValidValue={(candidate: string) => new RegExp(/^[0-9]+(\.[0-9]*)?$/g).test(candidate)}
          />
          <ObserverInput
            label="Height"
            getValue={() => props.gc.robotHeight + ""}
            setValue={(value: string) => { props.gc.robotHeight = parseFloat(parseFloat(value).toFixed(3)); }}
            isValidIntermediate={(candidate: string) => candidate === "" || new RegExp(/^[0-9]+(\.[0-9]*)?$/g).test(candidate)}
            isValidValue={(candidate: string) => new RegExp(/^[0-9]+(\.[0-9]*)?$/g).test(candidate)}
          />
          <FormControlLabel control={
            <Checkbox checked={props.gc.showRobot} onChange={(e, c) => {
              runInAction(() => props.gc.showRobot = c);
            }} />
          } label="Show Robot" sx={{ whiteSpace: "nowrap" }} />
        </Box>
        <Typography sx={{ marginTop: "2vh" }}>Unit of Length</Typography>
        <Box>
          <Select size="small" value={props.gc.uol} onChange={(e) => {
            runInAction(() => props.gc.uol = e.target.value as UnitOfLength);
          }}>
            {
              Object.keys(UnitOfLength).filter((x) => !isNaN(parseInt(x))).map((x) => {
                return <MenuItem key={x} value={parseInt(x)}>{UnitOfLength[parseInt(x)]}
                </MenuItem>
              })
            }
          </Select>
        </Box>
      </AccordionDetails>
    </Accordion>
  )
});

export { GeneralConfigAccordion };
