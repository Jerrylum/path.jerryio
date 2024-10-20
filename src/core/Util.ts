import { runInAction } from "mobx";
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from "util";
import { ValidationArguments, ValidationOptions, registerDecorator } from "class-validator";
import { TokenParser, NumberWithUnit, CodePointBuffer, Computation } from "../token/Tokens";
import { Unit } from "./Unit";
import { Vector } from "./Path";

export const TextEncoder = "TextEncoder" in window ? window.TextEncoder : NodeTextEncoder;
export const TextDecoder = "TextDecoder" in window ? window.TextDecoder : NodeTextDecoder;

export const IS_MAC_OS = (() => {
  const os = navigator.userAgent;
  if (os.search("Windows") !== -1) {
    return false;
  } else if (os.search("Mac") !== -1) {
    return true;
  } else {
    return false;
  }
})();

export function isFirefox() {
  return navigator.userAgent.indexOf("Firefox") !== -1;
}

export function isBraveBrowser(): boolean {
  return "brave" in navigator;
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function makeId(length: number) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export async function runInActionAsync<T>(action: () => T): Promise<T> {
  return new Promise(resolve => runInAction(() => resolve(action())));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function addToArray<T>(array: T[], item: T): boolean {
  if (array.includes(item)) {
    return false;
  } else {
    array.push(item);
    return true;
  }
}

export function removeFromArray<T>(array: T[], item: T): boolean {
  let index = array.indexOf(item);
  if (index !== -1) {
    array.splice(index, 1);
    return true;
  } else {
    return false;
  }
}

export function parseFormula<U extends Unit>(
  input: string,
  numParser: TokenParser<NumberWithUnit<U>>
): Computation<U> | null {
  return Computation.parseWith(new CodePointBuffer(input), numParser);
}

export function getFieldCanvasHalfHeight(windowSize: Vector) {
  return windowSize.y - 16 - 8 - 8 - 16 - 8 - windowSize.y * 0.12 - 8 - 16;
}

export function getFieldCanvasFullHeight(windowSize: Vector) {
  return windowSize.y - 16 * 2 - 8 * 2;
}

declare global {
  interface Number {
    toUser(digits?: number): number;
  }
}

// eslint-disable-next-line no-extend-native
Number.prototype.toUser = function (digits: number = 3) {
  return parseFloat(this.toFixed(digits));
};

export function parseUser(value: string, digits: number = 3): number {
  return parseFloat(value).toUser(digits);
}

export function ValidateNumber(validateFunc: (num: number) => boolean, validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      name: "validateNumber",
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [validateFunc],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const validateFunc: (num: number) => boolean = args.constraints[0];
          return typeof value === "number" && validateFunc(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `The ${args.property} must be a valid number`;
        }
      }
    });
  };
}

export function hex(input: Uint8Array) {
  return [...input].map(x => x.toString(16).padStart(2, "0")).join("");
}

export interface NumberMark {
  value: number;
  label: string;
}

export interface NumberRange {
  from: number;
  to: number;
}

export interface EditableNumberRange extends NumberRange {
  minLimit: NumberMark;
  maxLimit: NumberMark;
  step: number;
}

export function isNumberMark(value: any): value is NumberMark {
  return (
    typeof value === "object" && value !== null && typeof value.value === "number" && typeof value.label === "string"
  );
}

export function isEditableNumberRange(value: any): value is EditableNumberRange {
  return (
    typeof value === "object" &&
    value !== null &&
    isNumberMark(value.minLimit) &&
    isNumberMark(value.maxLimit) &&
    typeof value.step === "number" &&
    typeof value.from === "number" &&
    typeof value.to === "number"
  );
}

export function ValidateEditableNumberRange(min: number, max: number, validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      name: "ValidateEditableNumberRange",
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [min, max],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const minValue: number = args.constraints[0];
          const maxValue: number = args.constraints[1];
          if (isEditableNumberRange(value)) {
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
          return `The ${args.property} must be a valid NumberRange object with minLimit.value >= ${minValue}, maxLimit.value <= ${maxValue}, and step > 0`;
        }
      }
    });
  };
}

export function getMacHotKeyString(hotkey: string): string {
  return hotkey
    .replaceAll("Mod", "⌘")
    .replaceAll("Option", "⌥")
    .replaceAll("Ctrl", "⌃")
    .replaceAll("Shift", "⇧")
    .replaceAll("CapsLock", "⇪")
    .replaceAll("ArrowLeft", "←")
    .replaceAll("ArrowRight", "→")
    .replaceAll("ArrowUp", "↑")
    .replaceAll("ArrowDown", "↓")
    .replaceAll("Tab", "⇥")
    .replaceAll("Del", "⌫")
    .replaceAll(" ", "␣")
    .replaceAll("Esc", "") // Hide escape key
    .replaceAll("+", "")
    .replaceAll("Add", "+")
    .replaceAll("Equal", "+")
    .replaceAll("Subtract", "-")
    .replaceAll("Minus", "-");
}
