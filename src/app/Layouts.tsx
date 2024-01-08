import { Card } from "@mui/material";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import React from "react";
import { LayoutType } from "../core/Layout";
import { ControlAccordion } from "./common.blocks/ControlAccordion";
import { FieldCanvasElement } from "./FieldCanvasElement";
import { MenuAccordion } from "./common.blocks/MenuAccordion";
import { PathTreeAccordion } from "./common.blocks/PathTreeAccordion";
import { SpeedCanvasElement } from "./common.blocks/SpeedCanvasElement";
import { getAppStores } from "../core/MainApp";
import { action, makeAutoObservable } from "mobx";
import MenuIcon from "@mui/icons-material/Menu";
import TimelineIcon from "@mui/icons-material/Timeline";
import { Box, Typography } from "@mui/material";
import { MenuMainDropdown } from "./common.blocks/MenuAccordion";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import HomeIcon from "@mui/icons-material/Home";
import { useWindowSize } from "../core/Hook";
import {
  PanelAccordionContainer,
  PanelContainer,
  PanelFloatingContainer,
  PanelStaticContainer
} from "./common.blocks/Panel";
import { GeneralConfigAccordion } from "./GeneralConfigAccordion";
import { PathConfigAccordion } from "./PathAccordion";

export const LayoutContext = React.createContext<LayoutType>(LayoutType.Classic);
export const LayoutProvider = LayoutContext.Provider;

export const getAllPanelContainers = (layout: LayoutType): PanelContainer[] => {
  return [GeneralConfigAccordion({ layout }), ControlAccordion({ layout }), PathConfigAccordion({ layout })];
};
