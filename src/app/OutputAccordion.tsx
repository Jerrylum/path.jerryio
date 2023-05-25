import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AppProps } from '../App';

const OutputConfigAccordion = observer((props: AppProps) => {
  const oc = props.app.oc;

  function exportPathFile(): string | undefined {
    try {
      return props.app.format.exportPathFile(props.app);
    } catch (err) {
      console.log(err);
      alert("Error: Cannot export path file"); // TODO better error handling

      return undefined;
    }
  }

  async function writeFile(contents: string): Promise<boolean> {
    try {
      const fileHandle = props.app.mountingFile;
      if (fileHandle === null) throw new Error("fileHandle is undefined");

      const writable = await fileHandle.createWritable();
      await writable.write(contents);
      await writable.close();

      // TODO Show save notification
      return true;
    } catch (err) {
      console.log(err);

      alert("Error: Cannot save path file"); // TODO better error handling
      return false;
    }
  }

  async function readFile(): Promise<string | undefined> {
    const options = {
      types: [{ description: 'Path Files', accept: { 'text/plain': [] } },],
    };

    try {
      const [fileHandle] = await window.showOpenFilePicker(options);
      props.app.mountingFile = fileHandle;

      const file = await fileHandle.getFile();
      const contents = await file.text();

      return contents;
    } catch (err) {
      console.log(err);

      alert("Error: Cannot read path file"); // TODO better error handling
      return undefined;
    }
  }

  async function choiceSave(): Promise<boolean> {
    const options = {
      types: [{ description: 'Path Files', accept: { 'text/plain': [] } },],
    };

    try {
      const fileHandle = await window.showSaveFilePicker(options);
      props.app.mountingFile = fileHandle;
      return true;
    } catch (err) {
      console.log(err);

      // ignore error
      return false;
    }
  }

  async function onSave() {
    if (props.app.mountingFile === null) return onSaveAs();

    const output = exportPathFile();
    if (output === undefined) return;

    await writeFile(output);
  }

  async function onSaveAs() {
    const output = exportPathFile();
    if (output === undefined) return;

    if (!await choiceSave()) return;
    await writeFile(output);
  }

  async function onOpen() {
    let contents = await readFile();
    if (contents === undefined) return;

    try {
      props.app.importPathFile(contents);
    } catch (err) {
      console.log(err);

      alert("Error: Cannot import path file"); // TODO better error handling
    }
  }

  function onDownload() {
    const output = exportPathFile();
    if (output === undefined) return;

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
          <Button variant="text" onClick={onSave}>Save</Button>
          <Button variant="text" onClick={onSaveAs}>Save As</Button>
          <Button variant="text" onClick={onOpen}>Open</Button>
          <Button variant="text" onClick={onDownload}>Download</Button>
        </Box>
        {oc.getConfigPanel()}
      </AccordionDetails>
    </Accordion>
  )
});

export { OutputConfigAccordion };
