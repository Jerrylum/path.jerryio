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

/**
 * Get all available layout types based on the current window size
 * @param windowSize - The current window size
 * @returns All available layout types
 */
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

/**
 * Elect the preferred layout from all available layout types, which found based on the current window size
 * If the preferred layout is not available, return the first available layout type
 * @param windowSize - The current window size
 * @param preferred - The preferred layout type
 * @returns The elected layout type
 */
export function getUsableLayout(windowSize: Vector, preferred: LayoutType): LayoutType {
  const available = getAvailableLayouts(windowSize);
  if (available.includes(preferred)) return preferred;
  return available[0];
}

/**
 * The UserInterface class is responsible for managing all overlay and panel components
 */
export class UserInterface {
  private overlayNodeBuilders_: { uid: string; builder: OverlayNodeBuilder }[] = [];
  private panelBuilders_: { uid: string; builder: PanelBuilder }[] = [];

  private openingModal_: {
    symbol: Symbol;
    priority: number;
  } | null = null;

  /**
   * Get the symbol of the opening modal
   * @returns The symbol of the opening modal, or null if no modal is opening
   */
  get openingModal(): Symbol | null {
    return this.openingModal_?.symbol ?? null;
  }

  /**
   * Get the priority of the opening modal
   * @returns The priority of the opening modal, or null if no modal is opening
   */
  get currentOpeningModalPriority(): number | null {
    return this.openingModal_?.priority ?? null;
  }

  /**
   * Check if a modal is opening
   * @returns True if a modal is opening, otherwise false
   */
  get isOpeningModal() {
    return this.openingModal_ !== null;
  }

  /**
   * Open a modal with a given symbol and priority, the opened modal's symbol and priority will be stored
   * If the given priority is higher than the current opening modal's priority, the opening modal will be replaced
   * @param symbol - The symbol of the modal to open
   * @param priority - The priority of the modal to open, default is 0
   * @returns True if the modal is opened, otherwise false
   */
  openModal(symbol: Symbol, priority: number = 0): boolean {
    if (this.openingModal_ === null || this.openingModal_.priority <= priority) {
      this.openingModal_ = { symbol: symbol, priority };
      return true;
    } else {
      return false;
    }
  }

  /**
   * Close the opening modal with a given symbol
   * If the given symbol is not provided, or the symbol is the same as the opening modal, the opening modal will be closed
   * @param symbol - The symbol of the modal to close
   */
  closeModal(symbol?: Symbol) {
    if (symbol === undefined || this.openingModal_?.symbol === symbol) this.openingModal_ = null;
  }

  /**
   * Register function for register the corresponding builder function of a overlay and ID to the Overlay Builder list.
   * Return with the ID and disposer function of the corresponding overlay component
   * @param builder - The function to render the overlay component
   * @returns The object of ID and disposer function of the corresponding overlay component
   */
  registerOverlay(builder: OverlayNodeBuilder): { uid: string; disposer: () => void } {
    const uid = makeId(10);
    this.overlayNodeBuilders_.push({ uid, builder });
    return { uid, disposer: () => this.unregisterOverlay(uid) };
  }

  /**
   * To remove a registered object record of overlay builder via ID from the Overlay Builder list.
   * @param uid - The ID of the overlay builder to be removed
   */
  unregisterOverlay(uid: string): void {
    this.overlayNodeBuilders_ = this.overlayNodeBuilders_.filter(obj => obj.uid !== uid);
  }

  /**
   * Register function for register the corresponding builder function of a panel and ID to the Panel Builder list.
   * Return with the ID and disposer function of the corresponding panel component
   * @param builder - The function to render the panel component
   * @param index - The index of the panel component in the list
   * @returns The object of ID and disposer function of the corresponding panel component
   */
  registerPanel(builder: PanelBuilder, index?: number): { uid: string; disposer: () => void } {
    const uid = makeId(10);

    if (index === undefined) {
      this.panelBuilders_.push({ uid, builder });
    } else {
      this.panelBuilders_.splice(index, 0, { uid, builder });
    }
    return { uid, disposer: () => this.unregisterPanel(uid) };
  }

  /**
   * To remove a registered object record of panel builder via ID from the Panel Builder list.
   * @param uid - The ID of the panel builder to be removed
   */
  unregisterPanel(uid: string): void {
    this.panelBuilders_ = this.panelBuilders_.filter(obj => obj.uid !== uid);
  }

  /**
   * Get all registered overlay builders
   * @returns The list of all registered overlay builders
   */
  getAllOverlays(): { uid: string; builder: OverlayNodeBuilder }[] {
    return this.overlayNodeBuilders_;
  }

  /**
   * Get all registered panel builders
   * @returns The list of all registered panel builders
   */
  getAllPanels(): { uid: string; builder: PanelBuilder }[] {
    return this.panelBuilders_;
  }

  constructor() {
    makeAutoObservable(this);
  }
}
