import { Backdrop, BackdropTypeMap, Typography } from "@mui/material";
import { DefaultComponentProps } from "@mui/material/OverridableComponent";
import { observer } from "mobx-react-lite";

const DragDropBackdrop = observer((props: Omit<DefaultComponentProps<BackdropTypeMap>, "open">) => {
  return (
    <Backdrop
      className="modal-backdrop"
      sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}
      open={true}
      tabIndex={-1}
      {...props}>
      <Typography variant="h1" color="white" sx={{ pointerEvents: "none" }} gutterBottom>
        Drop Here
      </Typography>
    </Backdrop>
  );
});

export { DragDropBackdrop };
