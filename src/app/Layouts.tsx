import React from "react";
import { LayoutType, getUsableLayout } from "@core/Layout";
import { ControlConfigPanel } from "./common.blocks/panel/ControlConfigPanel";
import { PanelInstanceProps } from "./common.blocks/panel/Panel";
import { GeneralConfigPanel } from "./common.blocks/panel/GeneralConfigPanel";
import { PathConfigPanel } from "./common.blocks/panel/PathConfigPanel";
import { observer } from "mobx-react-lite";
import { useWindowSize } from "@src/core/Hook";
import { getAppStores } from "@src/core/MainApp";
import { ClassisLayout } from "./classic.blocks/_index";
import { ExclusiveLayout } from "./exclusive.blocks/_index";
import { MobileLayout } from "./mobile.blocks/_index";
import { makeAutoObservable } from "mobx";

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

export class UserInterface {
  private openingModal_: {
    symbol: Symbol;
    priority: number;
  } | null = null;

  get openingModal(): Symbol | null {
    return this.openingModal_?.symbol ?? null;
  }

  get currentOpeningModalPriority(): number | null {
    return this.openingModal_?.priority ?? null;
  }

  get isOpenModal() {
    return this.openingModal_ !== null;
  }

  openModal(symbol: Symbol, priority: number = 0): boolean {
    if (this.openingModal_ === null || this.openingModal_.priority <= priority) {
      this.openingModal_ = { symbol: symbol, priority };
      return true;
    } else {
      return false;
    }
  }

  closeModal(symbol?: Symbol) {
    if (symbol === undefined || this.openingModal_?.symbol === symbol) this.openingModal_ = null;
  }

  constructor() {
    makeAutoObservable(this);
  }
}
