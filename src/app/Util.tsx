import React, { DependencyList } from "react";
import { runInAction } from "mobx"
import { useHotkeys } from 'react-hotkeys-hook'
import { HotkeysEvent, HotkeyCallback, Options, RefType, Trigger } from 'react-hotkeys-hook/dist/types';
import { useAppStores } from "./MainApp";

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
    if (os.search('Windows') !== -1) {
      return false;
    } else if (os.search('Mac') !== -1) {
      return true;
    } else {
      return false;
    }
  }, []);
}

export interface CustomHotkeysOptions extends Options {
  preventDefaultOnlyIfEnabled?: boolean
}

export function useCustomHotkeys<T extends HTMLElement>(
  keys: string, callback: () => void,
  options?: CustomHotkeysOptions, dependencies?: DependencyList): React.MutableRefObject<RefType<T>> {
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
        if (timeRef.current === null || (Date.now() - timeRef.current) > 800) { // it is randomly chosen
          runInAction(func);
        }
        timeRef.current = Date.now();
      }
    }
  }

  return useHotkeys(useKeyName(keys), onKeydown(callback), {
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
      console.log(rtn, options?.preventDefaultOnlyIfEnabled, kvEvt.defaultPrevented);

      return rtn;
    }
  }, dependencies);
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
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
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
    }
  }, [enable, onClose]);
}

export function makeId(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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

declare global {
  interface Number {
    toUser(digits?: number): number;
  }
}

Number.prototype.toUser = function (digits: number = 3) { // eslint-disable-line no-extend-native
  return parseFloat(this.toFixed(digits));
}

export function parseUser(value: string, digits: number = 3): number {
  return parseFloat(value).toUser(digits);
}
