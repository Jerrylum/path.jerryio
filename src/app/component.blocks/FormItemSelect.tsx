import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { FormControlProps, FormControl, InputLabel, Select, SelectChangeEvent, MenuItem } from "@mui/material";
import React from "react";
import { makeId } from "@core/Util";

export type Item<TValue> = {
  key: string | number;
  value: TValue;
  label: string;
};

const FormItemSelect = observer(
  <TValue, TItem extends Item<TValue>, TItems extends TItem[]>(
    props: FormControlProps & {
      label: string;
      selected: TItems[number]["key"];
      items: TItems;
      onSelectItem: (item: TItems[number]["value"] | undefined) => void;
    }
  ) => {
    const { label, selected, items, onSelectItem, ...rest } = props;

    const uid = React.useRef(makeId(10)).current;

    return (
      <FormControl sx={{ width: "8rem" }} {...rest}>
        <InputLabel id={uid}>{label}</InputLabel>
        <Select
          labelId={uid}
          label={label}
          size="small"
          value={selected}
          onChange={action((e: SelectChangeEvent<React.Key>) =>
            onSelectItem(items.find(x => x.key === e.target.value)?.value)
          )}>
          {items.map(x => (
            <MenuItem key={x.key} value={x.key} children={x.label} />
          ))}
        </Select>
      </FormControl>
    );
  }
);

export { FormItemSelect };
