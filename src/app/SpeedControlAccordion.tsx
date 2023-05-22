import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import { makeAutoObservable } from "mobx"
import { observer } from "mobx-react-lite";

import { NumberRange, RangeSlider } from "./RangeSlider";

// observable class
export class SpeedConfig {
  speedLimit: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 600, label: "600" },
    step: 1,
    from: 40,
    to: 120,
  };
  applicationRange: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 4, label: "4" },
    step: 0.01,
    from: 1.4,
    to: 1.8,
  };
  transitionRange: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 1, label: "1" },
    step: 0.01,
    from: 0,
    to: 0.95,
  };

  getConfigPanel() {
    return (
      <>
        <Box className="panel-box">
          <Typography>Min/Max Speed</Typography>
          <RangeSlider range={this.speedLimit} />
        </Box>
        <Box className="panel-box">
          <Typography>Curve Deceleration Range</Typography>
          <RangeSlider range={this.applicationRange} />
        </Box>
        <Box className="panel-box">
          <Typography>Acceleration/Deceleration</Typography>
          <RangeSlider range={this.transitionRange} inverted />
        </Box>
      </>
    )
  }

  constructor() {
    makeAutoObservable(this);
  }
}

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
