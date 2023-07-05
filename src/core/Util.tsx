import React, { DependencyList } from "react";
import { runInAction } from "mobx";
import { useHotkeys } from "react-hotkeys-hook";
import { HotkeysEvent, HotkeyCallback, Options, RefType, Trigger } from "react-hotkeys-hook/dist/types";
import { useAppStores } from "./MainApp";
import { TokenParser, NumberWithUnit, CodePointBuffer, Computation } from "../token/Tokens";
import { Unit } from "./Unit";
import { Vector } from "./Path";

export function useTimer(ms: number) {
  const [time, setTime] = React.useState(Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), ms);
    return () => {
      clearInterval(interval);
    };
  }, [ms]);

  return time;
}

export function useIsMacOS() {
  return React.useMemo(() => {
    const os = navigator.userAgent;
    if (os.search("Windows") !== -1) {
      return false;
    } else if (os.search("Mac") !== -1) {
      return true;
    } else {
      return false;
    }
  }, []);
}

export interface CustomHotkeysOptions extends Options {
  preventDefaultOnlyIfEnabled?: boolean;
}

export function useCustomHotkeys<T extends HTMLElement>(
  keys: string,
  callback: () => void,
  options?: CustomHotkeysOptions,
  dependencies?: DependencyList
): React.MutableRefObject<RefType<T>> {
  const timeRef = React.useRef<number | null>(null);
  const enabledRef = React.useRef<boolean>(false);

  function onKeydown(func: () => void): HotkeyCallback {
    return function (kvEvt: KeyboardEvent, hkEvt: HotkeysEvent) {
      if (enabledRef.current === false) return;

      /*
      UX: Debounce the keydown event to prevent the callback from being called multiple times.
      If the user holds down the key, the callback will only be called once until the key is released.
      However, it auto resets after 800ms of no keydown events to prevent the case where the keyup event is missed.
      */

      if (kvEvt.type === "keyup") {
        timeRef.current = null;
      } else if (kvEvt.type === "keydown") {
        if (timeRef.current === null || Date.now() - timeRef.current > 800) {
          // 800 is randomly chosen
          runInAction(func);
        }
        timeRef.current = Date.now();
      }
    };
  }

  return useHotkeys(
    useKeyName(keys),
    onKeydown(callback),
    {
      ...options,
      keydown: true,
      keyup: true,
      preventDefault: false,
      enabled: (kvEvt: KeyboardEvent, hkEvt: HotkeysEvent): boolean => {
        let rtn: boolean;

        const enabledOptions: Trigger | undefined = options?.enabled;
        if (enabledOptions === undefined) {
          rtn = true;
        } else if (typeof enabledOptions === "function") {
          rtn = enabledOptions(kvEvt, hkEvt);
        } else {
          rtn = enabledOptions;
        }

        enabledRef.current = rtn;

        /*
        ALGO:
        If the hotkey is enabled: preventDefault
        If the hotkey is not enabled, it is allowed to preventDefault: preventDefault
        Else: do not preventDefault, but return true to prevent useHotkeys from calling preventDefault
        */
        if (rtn === true || options?.preventDefaultOnlyIfEnabled !== true) {
          kvEvt.preventDefault();
          kvEvt.stopPropagation();
        } else {
          rtn = true;
        }

        return rtn;
      }
    },
    dependencies
  );
}

export function useKeyName(key: string) {
  return useIsMacOS() ? key.replaceAll("Ctrl", "Ctrl") : key;
}

export function useUnsavedChangesPrompt() {
  const { app } = useAppStores();

  React.useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (app.history.isModified()) {
        // Cancel the event and show alert that
        // the unsaved changes would be lost
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [app.history]);
}

export function useBackdropDialog(enable: boolean, onClose?: () => void) {
  // Disable tabbing out of the dialog
  // This is used in HelpDialog and Preferences

  // UX: The combination "useEffect + onKeyDown + tabIndex(-1) in Card + ref" works as an alternative
  // UX: The combination "useCustomHotkeys + autoFocus in Backdrop + tabIndex(-1) in Card" doesn't work, user can still tab out of the dialog

  React.useEffect(() => {
    if (!enable) return;

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      } else if (e.key === "Tab") {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", onKeydown); // ALGO: Do not use window.addEventListener, it will not work

    return () => {
      document.removeEventListener("keydown", onKeydown);
    };
  }, [enable, onClose]);
}

export function useWindowSize(resizeCallback?: (newSize: Vector, oldSize: Vector) => void): Vector {
  const [size, setSize] = React.useState<Vector>(new Vector(window.innerWidth, window.innerHeight));

  React.useEffect(() => {
    const onResize = () => {
      const newSize = new Vector(window.innerWidth, window.innerHeight);

      setSize(oldSize => {
        resizeCallback?.(newSize, oldSize);
        return newSize;
      });
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [resizeCallback]);

  return size;
}

export function useDragDropFile(enable: boolean, onDrop: (file: File) => void) {
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);

  return {
    isDraggingFile,
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => setIsDraggingFile(true),
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => setIsDraggingFile(false),
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDrop: (e: React.DragEvent<HTMLDivElement>) => {
      setIsDraggingFile(false);
      e.preventDefault();
      e.stopPropagation();
      if (enable === false) return;

      const file = e.dataTransfer.files?.[0];
      if (file === undefined) return;
      onDrop(file);
    }
  };
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
