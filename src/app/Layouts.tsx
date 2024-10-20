import React from "react";
import { LayoutProvider, LayoutType } from "@core/Layout";
import { observer } from "mobx-react-lite";
import { getAppStores } from "@core/MainApp";
import { ClassisLayout } from "./classic.blocks/_index";
import { ExclusiveLayout } from "./exclusive.blocks/_index";
import { MobileLayout } from "./mobile.blocks/_index";

/**
 * The Layout component renders the corresponding layout based on the given layout type.
 * All overlays will also be pre-rendered.
 * @param props.targetLayout - The layout type to render.
 * @returns The rendered layout component.
 */
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
