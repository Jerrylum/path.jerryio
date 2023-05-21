import { TextField, TextFieldProps } from "@mui/material";
import { reaction, runInAction } from "mobx"
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useRef } from "react";


const ObserverInput = observer((props: TextFieldProps & {
  getValue: () => string
  setValue: (value: string) => void
  isValidIntermediate : (candidate: string) => boolean
  isValidValue: (candidate: string) => boolean
  allowEmpty?: boolean // default true
}
) => {
  // rest is used to send props to TextField without custom attributes
  const { getValue, setValue, isValidIntermediate, isValidValue, allowEmpty, ...rest } = props;

  const memoInitialValue = useMemo(() => getValue(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialValue = useRef(memoInitialValue);
  const lastValidValue = useRef(memoInitialValue);

  function onChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const element = (event.nativeEvent.target as HTMLInputElement);
    const candidate = element.value;

    if (!isValidIntermediate(candidate)) {
      event.preventDefault();

      element.value = lastValidValue.current;
    } else {
      lastValidValue.current = candidate;
    }
  }

  function onInputConfirm(event: React.KeyboardEvent<HTMLInputElement>) {
    const element = (event.nativeEvent.target as HTMLInputElement);

    if (event.code === "Enter" || event.code === "NumpadEnter") {
      event.preventDefault();
      element.blur();
      onConfirm(event);
    }
  }

  function onConfirm(event: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement, Event>) {
    const element = (event.nativeEvent.target as HTMLInputElement);
    const candidate = element.value;
    let rtn: string;

    if (isValidValue(candidate) === false || (allowEmpty !== false && candidate === "")) {
      element.value = rtn = initialValue.current;
    } else {
      rtn = candidate;
    }
    
    runInAction(() => setValue(initialValue.current = lastValidValue.current = rtn));
    inputRef.current!.value = getValue();
  }

  useEffect(() => {
    reaction(getValue, (value) => {
      if (value !== initialValue.current) {
        initialValue.current = value;
        lastValidValue.current = value;
        inputRef.current!.value = value;
      }
    });
  }, []);

  return (
    <TextField
      id="outlined-size-small"
      InputLabelProps={{ shrink: true }}
      inputRef={inputRef}
      size="small"
      defaultValue={memoInitialValue}
      onChange={onChange}
      onKeyDown={onInputConfirm}
      onBlur={onConfirm}
      {...rest}
    />
  );
});

export { ObserverInput };