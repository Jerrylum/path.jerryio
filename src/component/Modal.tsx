import Modal from "@mui/material/Modal";

import { makeAutoObservable, reaction } from "mobx";
import { observer } from "mobx-react-lite";
import React from "react";
import { getAppStores } from "../core/MainApp";
import { AssetManagerModalSymbol } from "../app/AssetManagerModal";

export class Modals {
  // TEST ONLY
  private opening_: {
    symbol: Symbol;
    priority: number;
  } | null = { symbol: AssetManagerModalSymbol, priority: 0 };

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

export const CustomModal = observer(
  (props: {
    symbol: Symbol; //
    children: React.ReactElement;
    onOpen?: () => void;
    onClose?: () => void;
  }) => {
    const { modals } = getAppStores();

    React.useEffect(() => {
      const disposer = reaction(
        () => modals.opening,
        (curr: Symbol | null, prev: Symbol | null) => {
          if (prev === props.symbol && curr === null) props.onClose?.();
          if (prev === null && curr === props.symbol) props.onOpen?.();
        }
      );

      return () => {
        disposer();
      };
    }, []);

    return (
      <Modal
        slotProps={{ backdrop: { className: "modal-backdrop" } }}
        container={document.getElementById("root-container")!}
        open={modals.opening === props.symbol}
        onClose={() => modals.close(props.symbol)}>
        {props.children}
      </Modal>
    );
  }
);

export { CustomModal as Modal };
