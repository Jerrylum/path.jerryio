import React from "react";
import { LayoutType } from "@core/Layout";
import { observer } from "mobx-react-lite";
import { getAppStores } from "@src/core/MainApp";
import { ClassisLayout } from "./classic.blocks/_index";
import { ExclusiveLayout } from "./exclusive.blocks/_index";
import { MobileLayout } from "./mobile.blocks/_index";

export const LayoutContext = React.createContext<LayoutType>(LayoutType.Classic);
export const LayoutProvider = LayoutContext.Provider;

export const Layout = observer((props: { targetLayout: LayoutType }) => {
  const { targetLayout } = props;
  const { ui } = getAppStores();

  return (
    <LayoutProvider value={targetLayout}>
      {targetLayout === LayoutType.Classic && <ClassisLayout />}
      {targetLayout === LayoutType.Exclusive && <ExclusiveLayout />}
      {targetLayout === LayoutType.Mobile && <MobileLayout />}
      {ui.getAllOverlays().map(obj => (
        <React.Fragment key={obj.uid}>{obj.builder()}</React.Fragment>
      ))}
    </LayoutProvider>
  );
});
