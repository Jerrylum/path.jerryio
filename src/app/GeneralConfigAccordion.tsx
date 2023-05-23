import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, SelectChangeEvent, Typography } from "@mui/material";
import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { Format } from '../format/format';
import { ObserverInput } from './ObserverInput';
import { GeneralConfig } from '../format/config';
import { LemLibFormatV0_4 } from '../format/LemLibFormatV0_4';
import { PathDotJerryioFormatV0_1 } from '../format/PathDotJerryioFormatV0_1';
import { UnitOfLength } from '../math/unit';

const GeneralConfigAccordion = observer((props: {
  gc: GeneralConfig,
  format: Format, setFormat: React.Dispatch<React.SetStateAction<Format>>
}) => {

  const formats: Format[] = [
    new LemLibFormatV0_4(),
    new PathDotJerryioFormatV0_1(),
  ];

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Configuration</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography gutterBottom>Format</Typography>
        <Box className="panel-box">
          <Select size="small" sx={{ maxWidth: "100%" }}
            value={formats.findIndex((x) => x.getName() === props.format.getName())}
            onChange={(e) => props.setFormat(formats[parseInt(e.target.value + "")])}>
            {
              formats.map((x, i) => {
                return <MenuItem key={i} value={i}>{x.getName()}</MenuItem>
              })
            }
          </Select>
        </Box>
        <Box className="flex-editor-panel" sx={{ marginTop: "2vh" }} >
          <FormControl sx={{ width: "8rem" }}>
            <InputLabel id="uol-label">Unit of Length</InputLabel>
            <Select labelId="uol-label" label="Unit of Length" size="small" value={props.gc.uol} onChange={action((e: SelectChangeEvent<UnitOfLength>) => props.gc.uol = e.target.value as UnitOfLength)}>
              {
                Object.keys(UnitOfLength).filter((x) => !isNaN(parseInt(x))).map((x) => {
                  return <MenuItem key={x} value={parseInt(x)}>{UnitOfLength[parseInt(x)]}
                  </MenuItem>
                })
              }
            </Select>
          </FormControl>
          <ObserverInput
            sx={{ width: "6rem" }}
            label="Knot Density"
            getValue={() => props.gc.knotDensity + ""}
            setValue={(value: string) => { props.gc.knotDensity = parseFloat(parseFloat(value).toFixed(3)); }}
            isValidIntermediate={(candidate: string) => candidate === "" || new RegExp(/^[0-9]+(\.[0-9]*)?$/g).test(candidate)}
            isValidValue={(candidate: string) => new RegExp(/^[0-9]+(\.[0-9]*)?$/g).test(candidate)}
          />
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
            <Checkbox checked={props.gc.showRobot} onChange={action((e, c) => props.gc.showRobot = c)} />
          } label="Show Robot" sx={{ whiteSpace: "nowrap" }} />
        </Box>
        {props.gc.getConfigPanel()}
      </AccordionDetails>
    </Accordion>
  )
});

export { GeneralConfigAccordion };
