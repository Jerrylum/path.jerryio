import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { AccordionSummary, Box, AccordionDetails, Card, Accordion } from "@mui/material";
import { observer } from "mobx-react-lite";
import { LayoutType } from "@src/core/Layout";
import "./Panel.scss";

export interface PanelContainer {
  id: string;
  header: React.ReactNode;
  headerProps?: { className?: string };
  children: React.ReactNode;
  bodyProps?: { className?: string };
  icon: React.ReactNode;
}

export interface PanelContainerBuilderProps {
  layout: LayoutType;
}

export type PanelContainerBuilder = (props: PanelContainerBuilderProps) => PanelContainer;

export interface PanelStaticContainerProps extends PanelContainer {
  containerProps?: React.ComponentProps<typeof Card>;
  headerProps?: React.ComponentProps<typeof Card>;
  bodyProps?: React.ComponentProps<typeof Card>;
}

export const PanelStaticContainer = observer((props: PanelStaticContainerProps) => {
  return (
    <Card {...props.containerProps}>
      <AccordionSummary {...props.headerProps} className="Panel-Header">
        {props.header}
      </AccordionSummary>
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
      <AccordionSummary expandIcon={<ExpandMoreIcon />} className="Panel-Header" {...props.headerProps}>
        {props.header}
      </AccordionSummary>
      <AccordionDetails {...props.bodyProps}>{props.children}</AccordionDetails>
    </Accordion>
  );
});

export interface PanelFloatingContainerProps extends PanelContainer {
  containerProps?: React.ComponentProps<typeof Box>;
  headerProps?: React.ComponentProps<typeof Box>;
  bodyProps?: React.ComponentProps<typeof Box>;
}

export const PanelFloatingContainer = observer((props: PanelFloatingContainerProps) => {
  return (
    <Box className="FloatingPanel" {...props.containerProps}>
      <Box className="Panel-Header FloatingPanel-Header" {...props.headerProps}>
        {props.header}
      </Box>
      <Box {...props.bodyProps}>{props.children}</Box>
    </Box>
  );
});
