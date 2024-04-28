import { TextareaAutosize, Typography } from "@mui/material";
import { getAppStores } from "@core/MainApp";
import { LayoutType } from "@core/Layout";
import { PanelContainer } from "./Panel";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import "./PathAccordion.scss";

export const CodeAccordion = (props: { layout: LayoutType }): PanelContainer => {
  const { app } = getAppStores();
  let decoder = new TextDecoder("utf-8");
  const pc = app.selectedPath?.pc;
  const newValue = app.exportFile();
  console.log(newValue);
  let arrayBuffer = newValue;
  let string = decoder.decode(arrayBuffer);
  let index = string.indexOf(`#PATH.JERRYIO-DATA`);
  if (index !== -1) {
    string = string.substring(0, index);
  }

  return {
    id: "CodeAccordion",
    header: "Code Output",
    children: (
      <>
        <TextareaAutosize
          value={string}
          readOnly
          style={{ width: "100%", backgroundColor: "transparent", color: "white" }}
        />
      </>
    ),
    icon: <LinearScaleIcon fontSize="large" />
  };
};
