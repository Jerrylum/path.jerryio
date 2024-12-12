import { Typography, TypographyProps } from "@mui/material";
import { observer } from "mobx-react-lite";
import "./FormButton.scss";

export const FormButton = observer((props: {} & TypographyProps) => {
  const { ...rest } = props;

  return <Typography variant="body1" component="button" className="FormButton-Button" {...rest} />;
});
