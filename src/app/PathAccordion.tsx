import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { PathConfig } from '../format/Config';

const PathConfigAccordion = observer((props: { pc: PathConfig | undefined }) => {
  const pc = props.pc;
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Path</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {pc?.getConfigPanel()}
      </AccordionDetails>
    </Accordion>
  )
});

export { PathConfigAccordion };
