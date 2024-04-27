import React from "react";
import { LayoutType } from "@core/Layout";
import { ControlAccordion } from "./common.blocks/panel/ControlAccordion";
import { PanelContainer } from "./common.blocks/panel/Panel";
import { GeneralConfigAccordion } from "./common.blocks/panel/GeneralConfigAccordion";
import { PathConfigAccordion } from "./common.blocks/panel/PathAccordion";
import { CodeAccordion } from "./common.blocks/panel/CodeAccordion";

export const LayoutContext = React.createContext<LayoutType>(LayoutType.Classic);
export const LayoutProvider = LayoutContext.Provider;

export const getAllPanelContainers = (layout: LayoutType): PanelContainer[] => {
  return [
    GeneralConfigAccordion({ layout }),
    CodeAccordion({ layout }),
    ControlAccordion({ layout }),
    PathConfigAccordion({ layout })
  ];
};
