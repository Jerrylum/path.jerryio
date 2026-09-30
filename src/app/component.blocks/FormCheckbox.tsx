import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { Checkbox, FormControlLabel, FormControlLabelProps } from "@mui/material";

const FormCheckbox = observer(
  (
    props: Omit<FormControlLabelProps, "control"> & {
      label: string;
      checked: boolean;
      onCheckedChange: (value: boolean) => void;
    }
  ) => {
    const { label, checked, onCheckedChange, ...rest } = props;

    return (
      <FormControlLabel
        control={<Checkbox checked={checked} onChange={action((e, c) => onCheckedChange(c))} />}
        label={label}
        sx={{ whiteSpace: "nowrap" }}
        {...rest}
      />
    );
  }
);

export { FormCheckbox };
