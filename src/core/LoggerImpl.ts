type Method = "debug" | "log" | "warn" | "error" | "groupCollapsed" | "groupEnd";

export default class LoggerImpl {
  private name_: string = "Global";
  private inGroup: boolean = false;

  constructor(name_: string) {
    if (!(this instanceof LoggerImpl)) {
      return new LoggerImpl(name_);
    }

    this.name_ = name_;
  }

  get name(): string {
    return this.name_;
  }

  debug(...args: any[]): void {
    this.print("debug", ...args);
  }

  log(...args: any[]): void {
    this.print("log", ...args);
  }

  warn(...args: any[]): void {
    this.print("warn", ...args);
  }

  error(...args: any[]): void {
    this.print("error", ...args);
  }

  groupCollapsed(...args: any[]): void {
    this.print("groupCollapsed", ...args);
  }

  groupEnd(): void {
    this.print("groupEnd");
  }

  print(method: Method, ...args: any[]): void {
    // ALGO: This implementation is adopted from https://github.com/GoogleChrome/workbox under the MIT license.

    if (method === "groupCollapsed") {
      // Safari doesn't print all console.groupCollapsed() arguments:
      // https://bugs.webkit.org/show_bug.cgi?id=182754
      if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
        console[method](...args);
        return;
      }
    }

    const styles = [
      `background: ${
        {
          debug: `#a4a4a4`,
          log: `#7F47B3`,
          warn: `#ED6C02`,
          error: `#D32F2F`,
          groupCollapsed: `#5C469C`,
          groupEnd: null // No colored prefix on groupEnd
        }[method]
      }`,
      `border-radius: 0.5em`,
      `color: white`,
      `font-weight: bold`,
      `padding: 2px 0.5em`
    ];

    // When in a group, the logger prefix is not displayed.
    const logPrefix = this.inGroup ? [] : [`%c${this.name}`, styles.join(";")];
    console[method](...logPrefix, ...args);

    if (method === "groupCollapsed") this.inGroup = true;
    else if (method === "groupEnd") this.inGroup = false;
  }
}
