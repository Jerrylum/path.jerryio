import { Backdrop, Box, Button, Card, Typography } from "@mui/material";
import React from "react";
import { useAppStores } from "./MainApp";
import { action } from "mobx"
import { observer } from "mobx-react-lite";

export interface ConfirmationButton {
  label: string;
  onClick?: () => void;
  hotkey?: string;
  color?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
}

export interface Confirmation {
  title: string;
  description: string;
  buttons: ConfirmationButton[];
}

const ConfirmationBackdrop = observer((props: { }) => {
  const { app } = useAppStores();

  const buttons = React.useRef<HTMLButtonElement[]>([]);
  const cfm = app.confirmation;

  if (buttons.current.length !== cfm?.buttons.length) {
    buttons.current = [];
  }

  React.useEffect(() => {
    if (cfm === undefined) return;  

    if (buttons.current.length > 0) {
      buttons.current[0].focus();
    }
  }, [cfm]);

  if (cfm === undefined) return (<></>);

  function onClick(idx: number) {
    app.confirmation = undefined;

    if (idx < 0 || idx >= cfm!.buttons.length) idx = cfm!.buttons.length - 1;

    cfm!.buttons[idx].onClick?.();
  }

  function onKeydown(e: React.KeyboardEvent<HTMLDivElement>) {
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
    } else {
      for (let i = 0; i < cfm!.buttons.length; i++) {
        if (e.key === cfm!.buttons[i].hotkey) {
          onClick(i);
          break;
        }
      }
    }
  }

  return (
    <Backdrop
      className="confirmation-backdrop"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={true}
      onClick={action(onClick.bind(null, -1))}
      onKeyDown={action(onKeydown)} >
      <Card className="confirmation-card" onClick={(e) => e.stopPropagation()} tabIndex={-1}>
        <Typography variant="h6" gutterBottom>{cfm.title}</Typography>
        {/* https://stackoverflow.com/questions/9769587/set-div-to-have-its-siblings-width */}
        <Box className="description-box">
          <Typography variant="body1" gutterBottom>{cfm.description}</Typography>
        </Box>
        <Box className="button-box">
          {
            cfm.buttons.map((btn, i) => {
              return <Button key={i}
                disableRipple
                tabIndex={i + 1001}
                variant="text"
                color={btn.color ?? "inherit"}
                autoFocus={i === 0}
                ref={(element) => buttons.current[i] = element!}
                onClick={action(onClick.bind(null, i))}
                {...(i + 1 === cfm.buttons.length ? {
                  onFocus: () => { buttons.current[i].tabIndex = 1000 },
                  onBlur: () => { buttons.current[i].tabIndex = i + 1001 },
                } : {})}>{btn.label}{btn.hotkey ? `(${btn.hotkey.toUpperCase()})` : ""}</Button>
            })
          }
        </Box>
      </Card>
    </Backdrop>
  );
});

export { ConfirmationBackdrop };
