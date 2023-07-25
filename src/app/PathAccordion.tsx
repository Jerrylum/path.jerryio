import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { getAppStores } from "../core/MainApp";

const PathConfigAccordion = observer((props: {}) => {
  const { app } = getAppStores();

  const pc = app.selectedPath?.pc;
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Path</Typography>
      </AccordionSummary>
      <AccordionDetails>{pc?.getConfigPanel()}</AccordionDetails>
    </Accordion>
  );
});

export { PathConfigAccordion };
