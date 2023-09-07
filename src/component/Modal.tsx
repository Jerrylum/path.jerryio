import Modal from "@mui/material/Modal";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";
import React from "react";
import { getAppStores } from "../core/MainApp";

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
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
