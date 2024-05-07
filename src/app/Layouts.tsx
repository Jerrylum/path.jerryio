import React from "react";
import { LayoutType, PanelInstanceProps, getUsableLayout } from "@core/Layout";
import { ControlConfigPanel } from "./common.blocks/panel/ControlConfigPanel";
import { GeneralConfigPanel } from "./common.blocks/panel/GeneralConfigPanel";
import { PathConfigPanel } from "./common.blocks/panel/PathConfigPanel";
import { observer } from "mobx-react-lite";
import { useWindowSize } from "@src/core/Hook";
import { getAppStores } from "@src/core/MainApp";
import { ClassisLayout } from "./classic.blocks/_index";
import { ExclusiveLayout } from "./exclusive.blocks/_index";
import { MobileLayout } from "./mobile.blocks/_index";

export const LayoutContext = React.createContext<LayoutType>(LayoutType.Classic);
export const LayoutProvider = LayoutContext.Provider;

export const getAllPanelContainers = (layout: LayoutType): PanelInstanceProps[] => {
  return [GeneralConfigPanel({}), ControlConfigPanel({}), PathConfigPanel({})];
};

export const Layout = observer(() => {
  const { appPreferences } = getAppStores();
  const windowSize = useWindowSize();
  const usingLayout = getUsableLayout(windowSize, appPreferences.layoutType);

  return (
    <LayoutProvider value={usingLayout}>
      {usingLayout === LayoutType.Classic && <ClassisLayout />}
      {usingLayout === LayoutType.Exclusive && <ExclusiveLayout />}
      {usingLayout === LayoutType.Mobile && <MobileLayout />}
    </LayoutProvider>
  );
});
