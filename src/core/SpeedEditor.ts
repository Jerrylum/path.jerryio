import { makeAutoObservable, action } from "mobx";
import { GraphCanvasConverter } from "./Canvas";
import { SpeedKeyframe, KeyframePos, Path } from "./Path";
import { clamp } from "./Util";

export type KeyframeInteraction =
  | {
      keyframe: SpeedKeyframe;
      type: "touch" | "drag/hover";
    }
  | {
      keyframe: null;
      type: "panning";
    };

export class SpeedEditor {
  private _offset: number = 0;
  private _interaction: KeyframeInteraction | undefined = undefined;
  private _lastInteraction: KeyframeInteraction | undefined = undefined;
  isAddingKeyframe: boolean = false;
  tooltipPosition: KeyframePos | undefined = undefined;

  path: Path | undefined = undefined;
  gcc!: GraphCanvasConverter; // XXX

  constructor() {
    makeAutoObservable(this, { path: false, gcc: false });

    // UX: Hide tooltip when the window size changes
    window.addEventListener(
      "resize",
      action(() => (this.tooltipPosition = undefined))
    );
    // UX: Hide tooltip when the user clicks outside of the tooltip
    document.addEventListener("touchstart", event => this.onTouchStartOrMouseDown(event));
    document.addEventListener("mousedown", event => this.onTouchStartOrMouseDown(event));
  }

  private onTouchStartOrMouseDown(event: TouchEvent | MouseEvent) {
    if (this.gcc === undefined) return;
    const fieldParent = this.gcc.container?.parentElement;
    const tooltips = [...(fieldParent?.querySelectorAll("*[role='tooltip']") ?? [])];

    const isUsingTooltip = tooltips.some(tooltip => tooltip.contains(event.target as Node));
    if (isUsingTooltip === false) this.tooltipPosition = undefined;
  }

  panning(vec: number) {
    if (this.path === undefined) {
      this.offset = 0;
    } else {
      const maxScrollPos = this.gcc.pointWidth * (this.path.cachedResult.points.length - 2);
      this.offset = clamp(this.offset - vec, 0, maxScrollPos);
    }
    // UX: This interaction is prioritized
    this.interaction = { keyframe: null, type: "panning" };
    // UX: Remove tooltip when panning
    this.tooltipPosition = undefined;
  }

  interact(keyframe: SpeedKeyframe, type: "touch" | "drag/hover") {
    if (this._interaction !== undefined && this._interaction.keyframe !== keyframe) return false;
    this.interaction = { keyframe, type };
    return true;
  }

  endInteraction() {
    this.interaction = undefined;
  }

  reset() {
    this._lastInteraction = undefined;
    this._interaction = undefined;
    this.isAddingKeyframe = false;
    this.tooltipPosition = undefined;
    this.offset = 0;
  }

  get offset() {
    return this._offset;
  }

  set offset(offset: number) {
    this._offset = offset;
  }

  get interaction() {
    return this._interaction;
  }

  get lastInteraction() {
    return this._lastInteraction;
  }

  private set interaction(newIt: KeyframeInteraction | undefined) {
    const oldIt = this._interaction;
    if ((oldIt === undefined) !== (newIt === undefined)) {
      this._lastInteraction = oldIt;
      this._interaction = newIt;
    } else if (
      oldIt !== undefined &&
      newIt !== undefined &&
      (oldIt.keyframe !== newIt.keyframe || oldIt.type !== newIt.type)
    ) {
      this._lastInteraction = oldIt;
      this._interaction = newIt;
    }
  }
}
