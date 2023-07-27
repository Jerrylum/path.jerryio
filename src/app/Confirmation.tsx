import { Backdrop, Box, Button, Card, Typography } from "@mui/material";
import React from "react";
import { getAppStores } from "../core/MainApp";
import { makeAutoObservable, action, when } from "mobx";
import { observer } from "mobx-react-lite";
import { useBackdropDialog } from "../core/Hook";
import { ObserverInput } from "../component/ObserverInput";

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
    this.data = undefined;
  }

  async prompt(data: ConfirmationPromptData | ConfirmationInputPromptData) {
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

    await when(() => this.data === undefined);

    return this.input;
  }

  get isOpen() {
    return this.data !== undefined;
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

const ConfirmationDialog = observer((props: {}) => {
  const { confirmation: cfm } = getAppStores();

  const buttons = React.useRef<HTMLButtonElement[]>([]);

  const getElements = React.useCallback((): (HTMLInputElement | HTMLButtonElement | null)[] => {
    const rtn: (HTMLInputElement | HTMLButtonElement | null)[] = [];
    if (cfm.input !== undefined) rtn.push(document.querySelector(".confirmation-card .input-box input"));
    rtn.push(...buttons.current);
    return rtn;
  }, [cfm.input]);

  if (buttons.current.length !== cfm.buttons.length) {
    buttons.current = [];
  }

  React.useEffect(() => {
    if (cfm.isOpen === false) return;

    getElements()[0]?.focus();
  }, [cfm.isOpen, getElements]);

  // UX: Disable tab globally when there is only one button
  useBackdropDialog(cfm.isOpen && cfm.buttons.length === 1);

  if (cfm.isOpen === false) return null;

  function onClick(idx: number) {
    if (idx < 0 || idx >= cfm.buttons.length) idx = cfm.buttons.length - 1;

    const func = cfm.buttons[idx]?.onClick;
    cfm.close();
    // ALGO: Call after closing the dialog in case the callback opens another dialog
    func?.();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      onClick(-1); // UX: Escape key always triggers the last button
    } else if (e.key === "ArrowLeft") {
      for (let i = 1; i < buttons.current.length; i++) {
        if (document.activeElement === buttons.current[i]) {
          buttons.current[i - 1].focus();
          break;
        }
      }
    } else if (e.key === "ArrowRight") {
      for (let i = 0; i < buttons.current.length - 1; i++) {
        if (document.activeElement === buttons.current[i]) {
          buttons.current[i + 1].focus();
          break;
        }
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();

      const elms = getElements();
      const index = elms.findIndex(elm => elm === document.activeElement);
      let next;
      if (index === -1) {
        next = e.shiftKey ? elms.length - 1 : 0;
      } else {
        next = e.shiftKey ? index - 1 : index + 1;
        if (next < 0) next = elms.length - 1;
        if (next >= elms.length) next = 0;
      }

      elms[next]?.focus();
    } else {
      for (let i = 0; i < cfm.buttons.length; i++) {
        if (e.key === cfm.buttons[i].hotkey) {
          onClick(i);
          break;
        }
      }
    }

    cfm.onKeyDown?.(e, onClick);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.code === "Enter" || e.code === "NumpadEnter") {
      onClick(0);
    }
  }

  // UX: tabIndex is important to make the dialog focusable, allow keyboard navigation, and disallow tab focus on other elements

  return (
    <Backdrop
      className="confirmation-dialog"
      sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}
      open={true}
      onClick={action(onClick.bind(null, -1))}
      onKeyDown={action(onKeyDown)}>
      <Card className="confirmation-card" onClick={e => e.stopPropagation()} tabIndex={-1}>
        <Typography variant="h2" gutterBottom>
          {cfm.title}
        </Typography>
        {/* https://stackoverflow.com/questions/9769587/set-div-to-have-its-siblings-width */}
        <Box className="description-box">
          <Typography component="div" variant="body1" gutterBottom>
            {cfm.description}
          </Typography>
        </Box>
        {cfm.input !== undefined && (
          <Box className="input-box">
            <ObserverInput
              label={cfm.inputLabel}
              getValue={() => cfm.input ?? ""}
              setValue={value => (cfm.input = value)}
              isValidIntermediate={() => true}
              isValidValue={() => true}
              tabIndex={1000}
              autoFocus
              onKeyDown={onInputKeyDown}
            />
          </Box>
        )}
        <Box className="button-box">
          {cfm.buttons.map((btn, i) => {
            return (
              <Button
                key={i}
                disableRipple
                variant="text"
                color={btn.color ?? "inherit"}
                tabIndex={1000}
                autoFocus={i === 0 && cfm.input === undefined}
                ref={element => (buttons.current[i] = element!)}
                onClick={action(onClick.bind(null, i))}>
                {btn.label}
                {btn.hotkey ? `(${btn.hotkey.toUpperCase()})` : ""}
              </Button>
            );
          })}
        </Box>
      </Card>
    </Backdrop>
  );
});

export { ConfirmationDialog };
