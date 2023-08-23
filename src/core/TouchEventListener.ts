import Konva from "konva";
import { Vector } from "./Path";
import { makeObservable, action, computed, observable } from "mobx";

export class TouchEventListener {
  touches: { [identifier: number]: { lastPosition: Vector; vector: Vector } } = {};

  constructor() {
    makeObservable(this, {
      touches: observable,
      keys: computed
    });
  }

  protected toVector(t: Touch) {
    return new Vector(t.clientX, t.clientY);
  }

  onTouchStart(evt: TouchEvent) {
    [...evt.changedTouches].forEach(t => {
      const pos = this.toVector(t);
      const lastPos = this.touches[t.identifier]?.lastPosition ?? pos;
      this.touches[t.identifier] = { lastPosition: pos, vector: pos.subtract(lastPos) };
    });

    evt.preventDefault(); // ALGO: Prevent mouse click event from firing
  }

  onTouchMove(evt: TouchEvent) {
    this.keys.forEach(k => {
      const t = [...evt.touches].find(t => t.identifier === k);
      if (t) {
        const pos = this.toVector(t);
        const lastPos = this.touches[t.identifier]?.lastPosition ?? pos;
        this.touches[t.identifier] = { lastPosition: pos, vector: pos.subtract(lastPos) };
      }
    });

    evt.preventDefault(); // ALGO: Prevent mouse click event from firing
  }

  onTouchEnd(evt: TouchEvent) {
    [...evt.changedTouches].forEach(t => {
      delete this.touches[t.identifier];
    });

    // ALGO: Just in case any touchend event is not fired
    if (evt.targetTouches.length === 0) {
      this.touches = {};
    }
  }

  /**
   * Get the identifiers of all touches started on the target element
   */
  get keys() {
    return Object.keys(this.touches).map(k => parseInt(k));
  }

  /**
   * Get the last position of the touch with the given identifier
   * @param key The identifier of the touch
   * @returns The last position of the touch
   */
  pos(key: number) {
    return this.touches[key].lastPosition;
  }

  /**
   * Get the vector of the touch movement since the last frame
   * @param key The identifier of the touch
   * @returns The vector of the touch movement since the last frame
   */
  vec(key: number) {
    return this.touches[key].vector;
  }
}
