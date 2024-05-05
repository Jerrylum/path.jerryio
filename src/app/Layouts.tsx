import React from "react";
import { LayoutType } from "@core/Layout";
import { ControlConfigPanel } from "./common.blocks/panel/ControlConfigPanel";
import { PanelInstance } from "./common.blocks/panel/Panel";
import { GeneralConfigPanel } from "./common.blocks/panel/GeneralConfigPanel";
import { PathConfigPanel } from "./common.blocks/panel/PathConfigPanel";

export const LayoutContext = React.createContext<LayoutType>(LayoutType.Classic);
export const LayoutProvider = LayoutContext.Provider;

export const getAllPanelContainers = (layout: LayoutType): PanelInstance[] => {
  return [GeneralConfigPanel({ layout }), ControlConfigPanel({ layout }), PathConfigPanel({ layout })];
};
