import LoggerImpl from "./LoggerImpl";

export { LoggerImpl };

export type Method = "debug" | "log" | "warn" | "error" | "groupCollapsed" | "groupEnd";

export interface Logger {
  name: string;
  debug(...args: any[]): void;
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  groupCollapsed(...args: any[]): void;
  groupEnd(): void;
  print(method: Method, ...args: any[]): void;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentionally naming the function the same as the type
export const Logger = function (name: string): Logger {
  return new LoggerImpl(name);
};
