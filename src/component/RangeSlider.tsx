import { Slider } from "@mui/material";
import { ValidationOptions, registerDecorator, ValidationArguments } from "class-validator";
import { action } from "mobx";
import { observer } from "mobx-react-lite";

export interface Mark {
  value: number;
  label: string;
}

export interface NumberRange {
  minLimit: Mark;
  maxLimit: Mark;
  step: number;
  from: number;
  to: number;
}

export function isMark(value: any): value is Mark {
  return (
    typeof value === "object" && value !== null && typeof value.value === "number" && typeof value.label === "string"
  );
}

export function isNumberRange(value: any): value is NumberRange {
  return (
    typeof value === "object" &&
    value !== null &&
    isMark(value.minLimit) &&
    isMark(value.maxLimit) &&
    typeof value.step === "number" &&
    typeof value.from === "number" &&
    typeof value.to === "number"
  );
}

const RangeSlider = observer(
  (props: { range: NumberRange; inverted?: boolean; onChange: (from: number, to: number) => void }) => {
    const range = props.range;

    return (
      <Slider
        step={range.step}
        marks={[range.minLimit, range.maxLimit]}
        valueLabelDisplay="auto"
        value={[range.from, range.to]}
        min={range.minLimit.value}
        max={range.maxLimit.value}
        onChange={action((event, value) => {
          if (!Array.isArray(value)) return;

          if (value[0] > value[1]) value[0] = value[1];

          props.onChange(value[0], value[1]);
        })}
        {...(props.inverted ? { track: "inverted" } : {})}
      />
    );
  }
);

export { RangeSlider };

export function ValidateNumberRange(min: number, max: number, validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      name: "ValidateNumberRange",
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [min, max],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const minValue: number = args.constraints[0];
          const maxValue: number = args.constraints[1];
          if (isNumberRange(value)) {
            return (
              minValue <= maxValue &&
              value.minLimit.value <= value.maxLimit.value &&
              value.minLimit.value >= minValue &&
              value.maxLimit.value <= maxValue &&
              value.step > 0 &&
              value.from <= value.to &&
              value.from >= value.minLimit.value &&
              value.to <= value.maxLimit.value
            );
          } else {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const minValue: number = args.constraints[0];
          const maxValue: number = args.constraints[1];
          return `The ${args.property} must be a valid NumberRange object with minLimit.value >= ${minValue}, maxLimit.value <= ${maxValue}, and step > 0`
        }
      }
    });
  };
}
