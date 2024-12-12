import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { AccordionSummary, Box, AccordionDetails, Card, Accordion } from "@mui/material";
import { PanelInstanceProps } from "@core/Layout";
import { observer } from "mobx-react-lite";
import "./Panel.scss";

export interface PanelStaticInstanceProps extends PanelInstanceProps {
  containerProps?: React.ComponentProps<typeof Card>;
  headerProps?: React.ComponentProps<typeof Card>;
  bodyProps?: React.ComponentProps<typeof Card>;
}

export const PanelStaticInstance = observer((props: PanelStaticInstanceProps) => {
  return (
    <Card {...props.containerProps}>
      <AccordionSummary {...props.headerProps} className="Panel-Header">
        {props.header}
      </AccordionSummary>
      <AccordionDetails {...props.bodyProps}>{props.children}</AccordionDetails>
    </Card>
  );
});

export interface PanelAccordionInstanceProps extends PanelInstanceProps {
  containerProps?: React.ComponentProps<typeof Accordion>;
  headerProps?: React.ComponentProps<typeof AccordionSummary>;
  bodyProps?: React.ComponentProps<typeof AccordionDetails>;
}

export const PanelAccordionInstance = observer((props: PanelAccordionInstanceProps) => {
  return (
    <Accordion defaultExpanded {...props.containerProps}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} className="Panel-Header" {...props.headerProps}>
        {props.header}
      </AccordionSummary>
      <AccordionDetails {...props.bodyProps}>{props.children}</AccordionDetails>
    </Accordion>
  );
});

export interface PanelFloatingInstanceProps extends PanelInstanceProps {
  containerProps?: React.ComponentProps<typeof Box>;
  headerProps?: React.ComponentProps<typeof Box>;
  bodyProps?: React.ComponentProps<typeof Box>;
}

export const PanelFloatingInstance = observer((props: PanelFloatingInstanceProps) => {
  return (
    <Box className="FloatingPanel" {...props.containerProps}>
      <Box className="Panel-Header FloatingPanel-Header" {...props.headerProps}>
        {props.header}
      </Box>
      <Box {...props.bodyProps}>{props.children}</Box>
    </Box>
  );
});
