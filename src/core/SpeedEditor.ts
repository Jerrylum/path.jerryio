import { makeAutoObservable, reaction } from "mobx";
import { GraphCanvasConverter } from "./Canvas";
import { Keyframe, KeyframePos, Path } from "./Path";
import { getAppStores } from "./MainApp";

export type KeyframeInteraction =
  | {
      keyframe: Keyframe;
      type: "touch" | "drag";
    }
  | {
      keyframe: null;
      type: "panning";
    };

export class SpeedEditor {
  private _offset: number = 0;
  private _interaction: KeyframeInteraction | undefined = undefined;
  private _lastInteraction: KeyframeInteraction | undefined = undefined;
  tooltipPosition: KeyframePos | undefined = undefined;

  path: Path | undefined = undefined;
  gcc!: GraphCanvasConverter; // XXX

  constructor() {
    makeAutoObservable(this, { path: false, gcc: false });
  }

  startPanning() {
    // UX: This interaction is prioritized
    this._interaction = { keyframe: null, type: "panning" };
  }

  interact(keyframe: Keyframe, type: "touch" | "drag") {
    if (this._interaction !== undefined && this._interaction.keyframe !== keyframe) return false;
    this._interaction = { keyframe, type };
  }

  endInteraction() {
    this._interaction = undefined;
  }

  reset() {
    this._lastInteraction = undefined;
    this._interaction = undefined;
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
}
