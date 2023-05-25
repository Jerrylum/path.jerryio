import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AppProps } from '../App';
import { Format } from '../format/Format';
import { useRef } from 'react';

const OutputConfigAccordion = observer((props: AppProps) => {
  const oc = props.app.oc;

  const fileHandleRef = useRef<FileSystemFileHandle>();

  async function onOpen() {
    const options = {
      types: [{ description: 'Path Files', accept: { 'text/plain': [] } },],
    };

    let contents: string;
    try {
      const [fileHandle] = await window.showOpenFilePicker(options);
      fileHandleRef.current = fileHandle;
      const file = await fileHandle.getFile();
      contents = await file.text();
    } catch (err) {
      console.log(err);

      // ignore error
      return;
    }

    try {
      props.app.importPathFile(contents);
    } catch (err) {
      console.log(err);

      alert("Error: Cannot import path file"); // TODO better error handling
    }
  }

  function onDownload() {
    let output: string;
    try {
      output = props.app.format.exportPathFile(props.app);
    } catch (err) {
      alert("Error: Cannot export path file"); // TODO better error handling
      return;
    }

    const a = document.createElement("a");
    const file = new Blob([output], { type: "text/plain" });
    a.href = URL.createObjectURL(file);
    a.download = "path.jerryio.txt"; // TODO better file name
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
          <Button variant="text" onClick={onOpen}>Open</Button>
          <Button variant="text" onClick={onDownload}>Download</Button>
        </Box>
        {oc.getConfigPanel()}
      </AccordionDetails>
    </Accordion>
  )
});

export { OutputConfigAccordion };
