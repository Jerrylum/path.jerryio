import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AppProps } from '../App';
import { Format } from '../format/format';

const OutputConfigAccordion = observer((props: AppProps) => {
  const oc = props.app.oc;

  function onDownload() {
    const output = props.app.format.exportPathFile(props.app);
    if (output === undefined) {
      alert("Error: Cannot export path file"); // TODO better error handling
      return;
    }
    const a = document.createElement("a");
    const file = new Blob([output], { type: "text/plain" });
    a.href = URL.createObjectURL(file);
    a.download = "path.jerryio.txt";
    a.click();
  }

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Output</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box>
          <Button variant="text">Save</Button>
          <Button variant="text">Save As</Button>
          <Button variant="text">Open</Button>
          <Button variant="text" onClick={onDownload}>Download</Button>
        </Box>
        {oc.getConfigPanel()}
      </AccordionDetails>
    </Accordion>
  )
});

export { OutputConfigAccordion };
