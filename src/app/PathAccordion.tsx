import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { PathConfig } from '../format/Config';
import { MainApp } from './MainApp';

const PathConfigAccordion = observer((props: { pc: PathConfig | undefined, app: MainApp }) => {
  const pc = props.pc;
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Path</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {pc?.getConfigPanel(props.app)}
      </AccordionDetails>
    </Accordion>
  )
});

export { PathConfigAccordion };
