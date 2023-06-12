import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, SelectChangeEvent, Typography } from "@mui/material";
import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { getAllFormats } from '../format/Format';
import { ObserverInput, parseNumberInString } from './ObserverInput';
import { NumberInUnit, UnitOfLength } from '../types/Unit';
import { UpdateProperties } from '../types/Command';
import { useAppStores } from './MainApp';

const GeneralConfigAccordion = observer((props: {}) => {
  const { app } = useAppStores();
  
  const gc = app.gc;

  const formats = getAllFormats();

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Configuration</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography gutterBottom>Format</Typography>
        <Box className="panel-box">
          <Select size="small" sx={{ maxWidth: "100%" }}
            value={formats.findIndex((x) => x.getName() === app.format.getName())}
            onChange={action((e: SelectChangeEvent<number>) => {
              app.confirmation = {
                title: "Change Format",
                description: "Some incompatible path configurations will be discarded. Edit history will be reset. Are you sure?",
                buttons: [
                  { label: "Confirm", onClick: () => app.format = formats[parseInt(e.target.value + "")] },
                  { label: "Cancel" },
                ]
              }
              
            })}>
            {
              formats.map((x, i) => {
                return <MenuItem key={i} value={i}>{x.getName()}</MenuItem>
              })
            }
          </Select>
        </Box>
        <Box className="flex-editor-panel" sx={{ marginTop: "2vh" }}>
          <FormControl sx={{ width: "8rem" }}>
            <InputLabel id="uol-label">Unit of Length</InputLabel>
            <Select labelId="uol-label" label="Unit of Length" size="small" value={gc.uol} onChange={
              action((e: SelectChangeEvent<UnitOfLength>) => app.history.execute(
                `Set Unit of Length`,
                new UpdateProperties(gc, { "uol": e.target.value as UnitOfLength })
              ))
            }>
              {
                Object.keys(UnitOfLength).filter((x) => !isNaN(parseInt(x))).map((x) => {
                  return <MenuItem key={x} value={parseInt(x)}>{UnitOfLength[parseInt(x)]}
                  </MenuItem>
                })
              }
            </Select>
          </FormControl>
          <ObserverInput
            sx={{ width: "7rem" }}
            label="Point Density"
            getValue={() => gc.pointDensity + ""}
            setValue={
              (value: string) => app.history.execute(
                `Change point density`,
                new UpdateProperties(gc, {
                  "pointDensity": parseNumberInString(
                    value,
                    gc.uol,
                    new NumberInUnit(0.1, UnitOfLength.Centimeter),
                    new NumberInUnit(100, UnitOfLength.Centimeter)
                  )
                })
              )
            }
            isValidIntermediate={(candidate: string) => candidate === "" || new RegExp(/^[0-9]+(\.[0-9]*)?$/g).test(candidate)}
            isValidValue={(candidate: string) => new RegExp(/^[0-9]+(\.[0-9]*)?$/g).test(candidate)}
            numeric
          />
        </Box>
        <Typography sx={{ marginTop: "2vh" }} gutterBottom>Robot Visualize</Typography>
        <Box className='flex-editor-panel'>
          <ObserverInput
            label="Width"
            getValue={() => gc.robotWidth + ""}
            setValue={(value: string) => gc.robotWidth = parseNumberInString(value, gc.uol,
              new NumberInUnit(0.1, UnitOfLength.Centimeter), new NumberInUnit(100, UnitOfLength.Centimeter))
            }
            isValidIntermediate={(candidate: string) => candidate === "" || new RegExp(/^[0-9]+(\.[0-9]*)?$/g).test(candidate)}
            isValidValue={(candidate: string) => new RegExp(/^[0-9]+(\.[0-9]*)?$/g).test(candidate)}
            numeric
          />
          <ObserverInput
            label="Height"
            getValue={() => gc.robotHeight + ""}
            setValue={(value: string) => gc.robotHeight = parseNumberInString(value, gc.uol,
              new NumberInUnit(0.1, UnitOfLength.Centimeter), new NumberInUnit(100, UnitOfLength.Centimeter))
            }
            isValidIntermediate={(candidate: string) => candidate === "" || new RegExp(/^[0-9]+(\.[0-9]*)?$/g).test(candidate)}
            isValidValue={(candidate: string) => new RegExp(/^[0-9]+(\.[0-9]*)?$/g).test(candidate)}
            numeric
          />
          <FormControlLabel control={
            <Checkbox checked={gc.showRobot} onChange={action((e, c) => gc.showRobot = c)} />
          } label="Show Robot" sx={{ whiteSpace: "nowrap" }} />
        </Box>
        {gc.getConfigPanel(app)}
      </AccordionDetails>
    </Accordion>
  )
});

export { GeneralConfigAccordion };
