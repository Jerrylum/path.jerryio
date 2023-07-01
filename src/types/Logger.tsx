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

export const Logger = function (name: string): Logger {
  return new LoggerImpl(name);
};
