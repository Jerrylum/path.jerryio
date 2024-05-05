import React from "react";
import { LayoutType } from "@core/Layout";
import { ControlPanel } from "./common.blocks/panel/ControlPanel";
import { PanelInstance } from "./common.blocks/panel/Panel";
import { GeneralConfigAccordion } from "./common.blocks/panel/GeneralConfigAccordion";
import { PathConfigAccordion } from "./common.blocks/panel/PathAccordion";

export const LayoutContext = React.createContext<LayoutType>(LayoutType.Classic);
export const LayoutProvider = LayoutContext.Provider;

export const getAllPanelContainers = (layout: LayoutType): PanelInstance[] => {
  return [GeneralConfigAccordion({ layout }), ControlPanel({ layout }), PathConfigAccordion({ layout })];
};
