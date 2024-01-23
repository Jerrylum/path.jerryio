import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { AccordionSummary, Box, AccordionDetails, Card, Accordion, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import "./Panel.scss";

export interface PanelContainer {
  id: string;
  header: React.ReactNode;
  headerProps?: { className?: string };
  children: React.ReactNode;
  bodyProps?: { className?: string };
  icon: React.ReactNode;
}

export interface PanelStaticContainerProps extends PanelContainer {
  containerProps?: React.ComponentProps<typeof Card>;
  headerProps?: React.ComponentProps<typeof Card>;
  bodyProps?: React.ComponentProps<typeof Card>;
}

export const PanelStaticContainer = observer((props: PanelStaticContainerProps) => {
  return (
    <Card {...props.containerProps}>
      <AccordionSummary {...props.headerProps}>{props.header}</AccordionSummary>
      <AccordionDetails {...props.bodyProps}>{props.children}</AccordionDetails>
    </Card>
  );
});

export interface PanelAccordionContainerProps extends PanelContainer {
  containerProps?: React.ComponentProps<typeof Accordion>;
  headerProps?: React.ComponentProps<typeof AccordionSummary>;
  bodyProps?: React.ComponentProps<typeof AccordionDetails>;
}

export const PanelAccordionContainer = observer((props: PanelAccordionContainerProps) => {
  return (
    <Accordion defaultExpanded {...props.containerProps}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} {...props.headerProps}>
        {props.header}
      </AccordionSummary>
      <AccordionDetails {...props.bodyProps}>{props.children}</AccordionDetails>
    </Accordion>
  );
});

export interface PanelFloatingContainerProps extends PanelContainer {
  containerProps?: React.ComponentProps<typeof Box>;
  headerProps?: React.ComponentProps<typeof Typography>;
  bodyProps?: React.ComponentProps<typeof Box>;
}

export const PanelFloatingContainer = observer((props: PanelFloatingContainerProps) => {
  return (
    <Box className="FloatingPanel" {...props.containerProps}>
      <Typography className="FloatingPanel-Header" {...props.headerProps}>
        {props.header}
      </Typography>
      <Box {...props.bodyProps}>{props.children}</Box>
    </Box>
  );
});
