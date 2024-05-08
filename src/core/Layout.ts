import { Vector } from "./Path";
import { getFieldCanvasHalfHeight } from "./Util";
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

export enum LayoutType {
  Classic = "classic", // UX: Default layout
  Exclusive = "exclusive",
  Mobile = "mobile"
}

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
  private modalBuilders_: { uid: string; builder: () => React.ReactNode }[] = [];

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

  getAllModalBuilders(): { uid: string; builder: () => React.ReactNode }[] {
    return this.modalBuilders_;
  }

  constructor() {
    makeAutoObservable(this);
  }
}
