import { Typography } from "@mui/material";
import { getAppStores } from "@core/MainApp";
import { LayoutType, PanelBuilderProps, PanelInstanceProps } from "@core/Layout";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import "./PathConfigPanel.scss";
import { observer } from "mobx-react-lite";
import React from "react";
import { LayoutContext } from "@src/app/Layouts";

const PathConfigPanelBody = observer((props: {}) => {
  const { app } = getAppStores();

  const pc = app.selectedPath?.pc;

  const isClassic = React.useContext(LayoutContext) === LayoutType.Classic;

  return (
    <>
      {pc && pc.getConfigPanel()}
      {pc === undefined && !isClassic && <Typography>(No selected path)</Typography>}
    </>
  );
});

export const PathConfigPanel = (props: PanelBuilderProps): PanelInstanceProps => {
  const { app } = getAppStores();

  return {
    id: "PathConfigAccordion",
    header: "Path",
    children: <PathConfigPanelBody />,
    icon: <LinearScaleIcon fontSize="large" />
  };
};
