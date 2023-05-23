import { makeAutoObservable } from "mobx"

import { GeneralConfig, SpeedConfig, OutputConfig } from "../format/config";
import { InteractiveEntity } from "../math/canvas";
import { Path, Vertex } from "../math/path";
import { addToArray, removeFromArray } from "./Util";


// observable class
export class MainApp {
  public gc: GeneralConfig = new GeneralConfig(); // a.k.a Configuration
  public sc: SpeedConfig = new SpeedConfig(); // a.k.a Speed Control
  public oc: OutputConfig = new OutputConfig(); // a.k.a Output

  public paths: Path[] = [];
  public selected: string[] = [];
  public expanded: string[] = [];
  public magnet: Vertex = new Vertex(Infinity, Infinity);

  constructor() {
    makeAutoObservable(this);
  }

  isSelected(x: InteractiveEntity | string): boolean {
    return typeof x === "string" ? this.selected.includes(x) : this.selected.includes(x.uid);
  }

  addSelected(x: InteractiveEntity | string): boolean {
    return addToArray(this.selected, typeof x === "string" ? x : x.uid);
  }

  removeSelected(x: InteractiveEntity | string): boolean {
    return removeFromArray(this.selected, typeof x === "string" ? x : x.uid);
  }

  isExpanded(x: InteractiveEntity | string): boolean {
    return typeof x === "string" ? this.expanded.includes(x) : this.expanded.includes(x.uid);
  }

  addExpanded(x: InteractiveEntity | string): boolean {
    return addToArray(this.expanded, typeof x === "string" ? x : x.uid);
  }

  removeExpanded(x: InteractiveEntity | string): boolean {
    return removeFromArray(this.expanded, typeof x === "string" ? x : x.uid);
  }
}
