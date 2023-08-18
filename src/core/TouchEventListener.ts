import Konva from "konva";
import { Vector } from "./Path";
import { makeObservable, action, computed, observable } from "mobx";

export class TouchEventListener {
  touchesLastPosition: { [identifier: number]: Vector } = {};
  touchesVector: { [identifier: number]: Vector } = {};

  constructor() {
    makeObservable(this, {
      touchesLastPosition: observable,
      touchesVector: observable,
      keys: computed
    });
  }

  protected toVector(t: Touch) {
    return new Vector(t.clientX, t.clientY);
  }

  onTouchStart(event: Konva.KonvaEventObject<TouchEvent>) {
    const evt = event.evt;

    [...evt.touches].forEach(t => {
      const pos = this.toVector(t);
      const lastPos = this.touchesLastPosition[t.identifier] ?? pos;
      this.touchesVector[t.identifier] = pos.subtract(lastPos);
      this.touchesLastPosition[t.identifier] = pos;
    });
  }

  onTouchMove(event: Konva.KonvaEventObject<TouchEvent>) {
    const evt = event.evt;

    [...evt.touches].forEach(t => {
      const pos = this.toVector(t);
      const lastPos = this.touchesLastPosition[t.identifier] ?? pos;
      this.touchesVector[t.identifier] = pos.subtract(lastPos);
      this.touchesLastPosition[t.identifier] = pos;
    });
  }

  onTouchEnd(event: Konva.KonvaEventObject<TouchEvent>) {
    const evt = event.evt;

    [...evt.changedTouches].forEach(t => {
      delete this.touchesVector[t.identifier];
      delete this.touchesLastPosition[t.identifier];
    });
  }

  get keys() {
    return Object.keys(this.touchesVector).map(k => parseInt(k));
  }

  pos(key: number) {
    return this.touchesLastPosition[key];
  }

  vec(key: number) {
    return this.touchesVector[key];
  }
}

