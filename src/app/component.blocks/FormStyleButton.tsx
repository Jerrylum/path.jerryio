import { Typography, TypographyProps } from "@mui/material";
import { observer } from "mobx-react-lite";
import "./FormStyleButton.scss";

export const FormStyleButton = observer((props: {} & TypographyProps) => {
  const { ...rest } = props;

  return <Typography variant="body1" component="button" className="FormStyleButton-Button" {...rest} />;
});
