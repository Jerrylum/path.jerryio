import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
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

const PathConfigFloatingPanel = observer((props: {}) => {
  const { app } = getAppStores();

  const pc = app.selectedPath?.pc;
  return (
    <Box className="floating-panel">
      <Typography className="floating-panel-title">Path</Typography>
      {pc ? pc.getConfigPanel() : <Typography>(No selected path)</Typography>}
    </Box>
  );
});

export { PathConfigAccordion, PathConfigFloatingPanel };
