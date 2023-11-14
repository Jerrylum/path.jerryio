import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { getAppStores } from "../core/MainApp";
import { TravelDistancePresentation } from "./Layouts";

const PathConfigAccordion = observer((props: {}) => {
  const { app } = getAppStores();

  const pc = app.selectedPath?.pc;
  return (
    <Accordion defaultExpanded sx={{ position: "relative" }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Path</Typography>
      </AccordionSummary>
      <AccordionDetails>{pc?.getConfigPanel()}</AccordionDetails>
      <Box id="mouse-position-presentation">
        {app.fieldEditor.mousePosInUOL && (
          <Typography>
            X: {app.fieldEditor.mousePosInUOL.x.toUser()}, Y: {app.fieldEditor.mousePosInUOL.y.toUser()}
          </Typography>
        )}
        <TravelDistancePresentation />
      </Box>
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
