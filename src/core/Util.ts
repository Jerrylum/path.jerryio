import { runInAction } from "mobx";
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder,  } from "util";
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
