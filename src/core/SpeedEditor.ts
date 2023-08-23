import { makeAutoObservable, reaction } from "mobx";
import { GraphCanvasConverter } from "./Canvas";
import { Keyframe, KeyframePos, Path } from "./Path";
import { getAppStores } from "./MainApp";

export type KeyframeInteraction = {
  keyframe: Keyframe;
  type: "touch" | "drag";
};

export class SpeedEditor {
  private _offset: number = 0;
  private _interaction: KeyframeInteraction | undefined = undefined;
  tooltipPosition: KeyframePos | undefined = undefined;

  gcc!: GraphCanvasConverter;

  constructor() {
    makeAutoObservable(this, { path: false, gcc: false });

    reaction(() => this.path, () => this.offset = 0);
  }

  interact(keyframe: Keyframe, type: "touch" | "drag") {
    this._interaction = { keyframe, type };
  }

  endInteraction() {
    this._interaction = undefined;
  }

  get offset() {
    return this._offset;
  }

  set offset(offset: number) {
    this._offset = offset;
  }

  get path() {
    const { app } = getAppStores();
    return app.interestedPath();
  }

  get interaction() {
    return this._interaction;
  }
}
