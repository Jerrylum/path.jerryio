import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { getAppStores } from "../core/MainApp";
import { TravelDistancePresentation } from "./Layouts";
import { LayoutType } from "../core/Layout";
import { PanelContainer } from "./common.blocks/Panel";
import LinearScaleIcon from "@mui/icons-material/LinearScale";

// const PathConfigAccordion = observer((props: {}) => {
//   const { app } = getAppStores();

//   const pc = app.selectedPath?.pc;
//   return (
//     <Accordion defaultExpanded sx={{ position: "relative" }}>
//       <AccordionSummary expandIcon={<ExpandMoreIcon />}>
//         <Typography>Path</Typography>
//       </AccordionSummary>
//       <AccordionDetails>{pc?.getConfigPanel()}</AccordionDetails>
//       <Box id="mouse-position-presentation">
//         {app.fieldEditor.mousePosInUOL && (
//           <Typography>
//             X: {app.fieldEditor.mousePosInUOL.x.toUser()}, Y: {app.fieldEditor.mousePosInUOL.y.toUser()}
//           </Typography>
//         )}
//         <TravelDistancePresentation />
//       </Box>
//     </Accordion>
//   );
// });

// TODO mouse-position-presentation

export const PathConfigAccordion = (props: { layout: LayoutType }): PanelContainer => {
  const { app } = getAppStores();

  const pc = app.selectedPath?.pc;

  return {
    id: "PathConfigAccordion",
    header: "Path",
    children: (
      <>
        {pc && pc.getConfigPanel()}
        {pc === undefined && props.layout !== LayoutType.Classic && <Typography>(No selected path)</Typography>}
      </>
    ),
    icon: <LinearScaleIcon fontSize="large" />
  };
};
