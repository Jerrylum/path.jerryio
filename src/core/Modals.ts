
import { makeAutoObservable } from "mobx";

export class Modals {
  // TEST ONLY
  private opening_: {
    symbol: Symbol;
    priority: number;
  } | null = null;

  get opening(): Symbol | null {
    return this.opening_?.symbol ?? null;
  }

  get priority(): number | null {
    return this.opening_?.priority ?? null;
  }

  get isOpen() {
    return this.opening_ !== null;
  }

  open(symbol: Symbol, priority: number = 0): boolean {
    if (this.opening_ === null || this.opening_.priority <= priority) {
      this.opening_ = { symbol: symbol, priority };
      return true;
    } else {
      return false;
    }
  }

  close(symbol?: Symbol) {
    if (symbol === undefined || this.opening_?.symbol === symbol) this.opening_ = null;
  }

  constructor() {
    makeAutoObservable(this);
  }
}
