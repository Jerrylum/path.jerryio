import { Typography } from "@mui/material";
import { getAppStores } from "@core/MainApp";
import { LayoutType } from "@core/Layout";
import { PanelContainer } from "./Panel";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import "./PathAccordion.scss";

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
