import { TextField, TextFieldProps } from "@mui/material";
import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useRef } from "react";
import { Quantity, UnitConverter, UnitOfLength } from "../core/Unit";
import { clamp } from "../app/Util";

export function clampQuantity(
  value: number,
  uol: UnitOfLength,
  min = new Quantity(-Infinity, UnitOfLength.Centimeter),
  max = new Quantity(+Infinity, UnitOfLength.Centimeter)
): number {
  const minInUOL = new UnitConverter(min.unit, uol).fromAtoB(min.value);
  const maxInUOL = new UnitConverter(max.unit, uol).fromAtoB(max.value);

  return clamp(value, minInUOL, maxInUOL).toUser();
}

const ObserverInput = observer(
  (
    props: TextFieldProps & {
      getValue: () => string;
      setValue: (value: string, payload: any) => void;
      isValidIntermediate: (candidate: string) => boolean;
      isValidValue: (candidate: string) => boolean | [boolean, any];
      numeric?: boolean; // default false
    }
  ) => {
    // rest is used to send props to TextField without custom attributes
    const { getValue, setValue, isValidIntermediate, isValidValue, numeric: isNumeric, ...rest } = props;

    const memoInitialValue = useMemo(() => getValue(), []); // eslint-disable-line react-hooks/exhaustive-deps
    const inputRef = useRef<HTMLInputElement>(null);
    const initialValue = useRef(memoInitialValue);
    const lastValidIntermediate = useRef(memoInitialValue);

    function onChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
      const element = event.nativeEvent.target as HTMLInputElement;
      const candidate = element.value;

      if (!isValidIntermediate(candidate)) {
        event.preventDefault();

        element.value = lastValidIntermediate.current;
      } else {
        lastValidIntermediate.current = candidate;
      }
    }

    function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
      const element = event.nativeEvent.target as HTMLInputElement;

      if (event.code === "Enter" || event.code === "NumpadEnter") {
        event.preventDefault();
        element.blur();
        onConfirm(event);
      } else if (isNumeric && event.code === "ArrowDown") {
        onConfirm(event);
        element.value = parseFloat(getValue()) - 1 + "";
        onConfirm(event);
      } else if (isNumeric && event.code === "ArrowUp") {
        onConfirm(event);
        element.value = parseFloat(getValue()) + 1 + "";
        onConfirm(event);
      }

      rest.onKeyDown?.(event);
    }

    function onBlur(event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
      onConfirm(event);

      rest.onBlur?.(event);
    }

    function onConfirm(event: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement, Event>) {
      const element = event.nativeEvent.target as HTMLInputElement;
      const candidate = element.value;
      let rtn: string;

      const result = isValidValue(candidate);
      const isValid = Array.isArray(result) ? result[0] : result;
      const payload = Array.isArray(result) ? result[1] : undefined;
      if (isValid === false) {
        element.value = rtn = initialValue.current;
      } else {
        rtn = candidate;
      }

      setValue(rtn, payload);
      inputRef.current && (inputRef.current.value = initialValue.current = lastValidIntermediate.current = getValue());
    }

    const value = getValue();

    useEffect(() => {
      const value = getValue();
      if (value !== initialValue.current) {
        initialValue.current = value;
        lastValidIntermediate.current = value;
        inputRef.current!.value = value;
      }
    }, [value, getValue]);

    return (
      <TextField
        id="outlined-size-small"
        InputLabelProps={{ shrink: true }}
        inputRef={inputRef}
        size="small"
        defaultValue={memoInitialValue}
        onChange={onChange}
        {...rest}
        onKeyDown={action(onKeyDown)}
        onBlur={action(onBlur)}
      />
    );
  }
);

export { ObserverInput };
