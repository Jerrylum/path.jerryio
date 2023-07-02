import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { FormControlProps, FormControl, InputLabel, Select, SelectChangeEvent, MenuItem } from "@mui/material";
import React from "react";
import { makeId } from "../core/Util";

const ObserverEnumSelect = observer(
  <T extends number | string>(
    props: FormControlProps & {
      label: string;
      enumValue: T;
      onEnumChange: (value: T) => void;
      enumType: any;
    }
  ) => {
    const { label, enumValue, onEnumChange, enumType, ...rest } = props;

    const uid = React.useRef(makeId(10)).current;

    return (
      <FormControl sx={{ width: "8rem" }} {...rest}>
        <InputLabel id={uid}>{label}</InputLabel>
        <Select
          labelId={uid}
          label={label}
          size="small"
          value={enumValue}
          onChange={action((e: SelectChangeEvent<T>) => onEnumChange(e.target.value as T))}>
          {Object.keys(enumType)
            .filter(x => isNaN(parseInt(x)))
            .map(x => (
              <MenuItem key={x} value={enumType[x]}>
                {x}
              </MenuItem>
            ))}
        </Select>
      </FormControl>
    );
  }
);

export { ObserverEnumSelect };
