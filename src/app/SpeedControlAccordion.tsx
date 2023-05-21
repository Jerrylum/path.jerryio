import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import { runInAction, makeAutoObservable } from "mobx"
import { observer } from "mobx-react-lite";

import { NumberRange, RangeSlider } from "./RangeSlider";

export class SpeedConfig {
  speedLimit: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 127, label: "127" },
    step: 1,
    from: 20,
    to: 100,
  };
  applicationRange: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 1, label: "1" },
    step: 0.01,
    from: 0,
    to: 0.4,
  };
  transitionRange: NumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 1, label: "1" },
    step: 0.01,
    from: 0,
    to: 0.95,
  };

  constructor() {
    makeAutoObservable(this);
  }
}

const SpeedControlAccordion = observer((props: { sc: SpeedConfig }) => {
  const sc = props.sc;
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Speed Control</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <div style={{ marginTop: "1vh" }}>
          <Typography id="input-slider">Min/Max Speed</Typography>
          <RangeSlider range={sc.speedLimit} />
        </div>
        <div style={{ marginTop: "1vh" }}>
          <Typography id="input-slider">Application Range</Typography>
          <RangeSlider range={sc.applicationRange} />
        </div>
        <div style={{ marginTop: "1vh" }}>
          <Typography id="input-slider">Acceleration/Deceleration</Typography>
          <RangeSlider range={sc.transitionRange} />
        </div>
      </AccordionDetails>
    </Accordion>
  )
});

export { SpeedControlAccordion };
