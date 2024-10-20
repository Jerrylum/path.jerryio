import { action } from "mobx";
import { Tooltip, TooltipProps, Typography, styled, tooltipClasses } from "@mui/material";
import { getAppStores } from "@core/MainApp";
import classNames from "classnames";
import "./CanvasTooltip.scss";

export const Padding0Tooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: classNames(className, "CanvasTooltip") }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    padding: "0",
    marginBottom: "8px !important"
  }
}));

export const CanvasTooltip = function (props: { text: string; onClick: () => void }) {
  const { app } = getAppStores();

  return (
    <Typography
      variant="body2"
      component="span"
      className="CanvasTooltip-Label"
      onClick={action(() => {
        props.onClick();
        app.fieldEditor.tooltipPosition = undefined; // UX: Hide tooltip
        app.speedEditor.tooltipPosition = undefined; // UX: Hide tooltip
      })}>
      {props.text}
    </Typography>
  );
};
