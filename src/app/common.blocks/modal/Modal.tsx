import Modal from "@mui/material/Modal";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";
import React from "react";
import { getAppStores } from "@core/MainApp";

import "./Modal.scss";

export const CustomModal = observer(
  (props: {
    symbol: Symbol; //
    children: React.ReactElement;
    onOpen?: () => void;
    onClose?: () => void;
  }) => {
    const { ui } = getAppStores();

    React.useEffect(() => {
      const disposer = reaction(
        () => ui.openingModal,
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
        slotProps={{ backdrop: { className: "Modal-Backdrop" } }}
        container={document.getElementById("Root-Container")!}
        open={ui.openingModal === props.symbol}
        onClose={() => ui.closeModal(props.symbol)}>
        {props.children}
      </Modal>
    );
  }
);

export { CustomModal as Modal };
