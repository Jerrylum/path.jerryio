import React from "react";
import { Vector } from "./Path";
import { getFieldCanvasHalfHeight, makeId } from "./Util";
import { makeAutoObservable } from "mobx";

export interface PanelInstanceProps {
  id: string;
  header: React.ReactNode;
  headerProps?: { className?: string };
  children: React.ReactNode;
  bodyProps?: { className?: string };
  icon: React.ReactNode;
}

export interface PanelBuilderProps {}

export type PanelBuilder = (props: PanelBuilderProps) => PanelInstanceProps;

export type OverlayNodeBuilder = () => React.ReactNode;

export enum LayoutType {
  Classic = "classic", // UX: Default layout
  Exclusive = "exclusive",
  Mobile = "mobile"
}

export const LayoutContext = React.createContext<LayoutType>(LayoutType.Classic);
export const LayoutProvider = LayoutContext.Provider;

export function getAvailableLayouts(windowSize: Vector): LayoutType[] {
  const widthForClassic = 16 + 288 + 16 + getFieldCanvasHalfHeight(windowSize) + 16 + 352 + 16;
  const heightForClassic = 600;
  if (windowSize.x >= widthForClassic && windowSize.y >= heightForClassic)
    return [LayoutType.Classic, LayoutType.Exclusive, LayoutType.Mobile];

  const widthForExclusive = 560;
  const heightForExclusive = 480;
  if (windowSize.x >= widthForExclusive && windowSize.y >= heightForExclusive)
    return [LayoutType.Exclusive, LayoutType.Mobile];

  return [LayoutType.Mobile];
}

export function getUsableLayout(windowSize: Vector, preferred: LayoutType): LayoutType {
  const available = getAvailableLayouts(windowSize);
  if (available.includes(preferred)) return preferred;
  return available[0];
}

export class UserInterface {
  private overlayNodeBuilders_: { uid: string; builder: OverlayNodeBuilder }[] = [];
  private panelBuilders_: { uid: string; builder: PanelBuilder }[] = [];

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

  get isOpeningModal() {
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

  registerOverlay(builder: OverlayNodeBuilder): { uid: string; disposer: () => void } {
    const uid = makeId(10);
    this.overlayNodeBuilders_.push({ uid, builder });
    return { uid, disposer: () => this.unregisterOverlay(uid) };
  }

  unregisterOverlay(uid: string): void {
    this.overlayNodeBuilders_ = this.overlayNodeBuilders_.filter(obj => obj.uid !== uid);
  }

  registerPanel(builder: PanelBuilder, index?: number): { uid: string; disposer: () => void } {
    const uid = makeId(10);

    if (index === undefined) {
      this.panelBuilders_.push({ uid, builder });
    } else {
      this.panelBuilders_.splice(index, 0, { uid, builder });
    }
    return { uid, disposer: () => this.unregisterPanel(uid) };
  }

  unregisterPanel(uid: string): void {
    this.panelBuilders_ = this.panelBuilders_.filter(obj => obj.uid !== uid);
  }

  getAllOverlays(): { uid: string; builder: OverlayNodeBuilder }[] {
    return this.overlayNodeBuilders_;
  }

  getAllPanels(): { uid: string; builder: PanelBuilder }[] {
    return this.panelBuilders_;
  }

  constructor() {
    makeAutoObservable(this);
  }
}
