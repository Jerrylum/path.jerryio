import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { SpeedConfig } from '../format/Config';

const SpeedConfigAccordion = observer((props: { sc: SpeedConfig }) => {
  const sc = props.sc;
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Speed Control</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {sc.getConfigPanel()}
      </AccordionDetails>
    </Accordion>
  )
});

export { SpeedConfigAccordion };
