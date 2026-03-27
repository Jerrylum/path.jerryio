import { Box, Button, Card, Typography } from "@mui/material";
import React from "react";
import { getAppStores } from "@core/MainApp";
import { makeAutoObservable, action, when, observable, reaction } from "mobx";
import { observer } from "mobx-react-lite";
import { useMobxStorage } from "@core/Hook";
import { FormInputField } from "@app/component.blocks/FormInputField";
import { Modal } from "./Modal";

import "./ConfirmationModal.scss";

export interface ConfirmationButton {
  label: string;
  onClick?: () => void;
  hotkey?: string;
  color?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
}

export interface ConfirmationPromptData {
  title: string;
  description: React.ReactNode;
  buttons: ConfirmationButton[];
  onKeyDown?(e: React.KeyboardEvent<HTMLDivElement>, onClick: (index: number) => void): void;
}

export interface ConfirmationInputPromptData extends ConfirmationPromptData {
  inputLabel: string;
  inputDefaultValue: string;
}

export class Confirmation {
  private data?: ConfirmationPromptData | ConfirmationInputPromptData;
  public input?: string;

  constructor() {
    makeAutoObservable(this);
  }

  close() {
    const { ui } = getAppStores();
    ui.closeModal(ConfirmationModalSymbol);

    this.data = undefined;
  }

  async prompt(data: ConfirmationPromptData | ConfirmationInputPromptData, priority: number = 1) {
    if (data.buttons.length === 0) {
      data.buttons.push({ label: "OK" });
    }

    this.close();
    this.data = data;
    if ("inputLabel" in data && "inputDefaultValue" in data) {
      this.input = data.inputDefaultValue;
    } else {
      this.input = undefined;
    }

    const { ui } = getAppStores();
    ui.openModal(ConfirmationModalSymbol, priority);

    await when(() => this.data === undefined);

    return this.input;
  }

  get isOpen() {
    const { ui } = getAppStores();

    return this.data !== undefined && ui.openingModal === ConfirmationModalSymbol;
  }

  get title() {
    return this.data?.title ?? "";
  }

  set title(value: string) {
    if (this.data === undefined) return;
    this.data.title = value;
  }

  get description() {
    return this.data?.description ?? "";
  }

  set description(value: React.ReactNode) {
    if (this.data === undefined) return;
    this.data.description = value;
  }

  get buttons() {
    return this.data?.buttons ?? [];
  }

  get onKeyDown() {
    return this.data?.onKeyDown;
  }

  get inputLabel() {
    return (this.data as ConfirmationInputPromptData)?.inputLabel ?? "";
  }
}

const ConfirmationModalSymbol = Symbol("ConfirmationModalSymbol");

export const ConfirmationModal = observer(() => {
  const { confirmation: cfm } = getAppStores();

  const buttons = useMobxStorage(() => observable([] as (HTMLButtonElement | null)[]), [cfm.isOpen]);
  const [renderCount, setRenderCount] = React.useState(0);

  React.useEffect(() => {
    return reaction(
      () => buttons.length,
      () => setRenderCount(renderCount => renderCount + 1)
    );
  }, [buttons]);

  React.useEffect(() => {
    (document.querySelector("*[data-testid=sentinelStart]") as HTMLElement | undefined)?.focus();
  }, [renderCount]);

  if (cfm.isOpen === false) return null;

  const focusOnButton = (offset: number) => buttons[buttons.indexOf(document.activeElement as any) + offset]?.focus();

  function onClick(idx: number) {
    if (idx < 0 || idx >= cfm.buttons.length) idx = cfm.buttons.length - 1;

    const func = cfm.buttons[idx]?.onClick;
    cfm.close();
    // ALGO: Call after closing the dialog in case the callback opens another dialog
    func?.();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === "ArrowLeft") {
      focusOnButton(-1);
    } else if (e.key === "ArrowRight") {
      focusOnButton(1);
    } else {
      const index = cfm.buttons.findIndex(btn => btn.hotkey === e.key);
      index !== -1 && onClick(index);
    }

    cfm.onKeyDown?.(e, onClick);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.code === "Enter" || e.code === "NumpadEnter") {
      onClick(0);
    }
  }

  return (
    <Modal symbol={ConfirmationModalSymbol} onClose={action(onClick.bind(null, -1))}>
      <Card id="ConfirmationModal" className="Modal-Container" onKeyDown={action(onKeyDown)}>
        <Typography variant="h2" gutterBottom>
          {cfm.title}
        </Typography>
        {/* https://stackoverflow.com/questions/9769587/set-div-to-have-its-siblings-width */}
        <Box className="ConfirmationModal-DescriptionBox">
          <Typography component="div" variant="body1" gutterBottom>
            {cfm.description}
          </Typography>
        </Box>
        {cfm.input !== undefined && (
          <Box className="ConfirmationModal-InputBox">
            <FormInputField
              label={cfm.inputLabel}
              getValue={() => cfm.input ?? ""}
              setValue={value => (cfm.input = value)}
              isValidIntermediate={() => true}
              isValidValue={() => true}
              onKeyDown={onInputKeyDown}
            />
          </Box>
        )}
        <Box className="ConfirmationModal-ButtonBox">
          {cfm.buttons.map((btn, i) => {
            return (
              <Button
                key={i}
                disableRipple
                variant="text"
                color={btn.color ?? "inherit"}
                ref={action((element: HTMLButtonElement | null) => (buttons[i] = element))}
                onClick={action(onClick.bind(null, i))}>
                {btn.label}
                {btn.hotkey ? `(${btn.hotkey.toUpperCase()})` : ""}
              </Button>
            );
          })}
        </Box>
      </Card>
    </Modal>
  );
});
