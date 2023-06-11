import React, { DependencyList } from "react";
import { runInAction } from "mobx"
import { useHotkeys } from 'react-hotkeys-hook'
import { HotkeysEvent, HotkeyCallback, Options, RefType, Trigger } from 'react-hotkeys-hook/dist/types';

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

export function useCustomHotkeys<T extends HTMLElement>(
  keys: string, callback: () => void,
  options?: Options, dependencies?: DependencyList): React.MutableRefObject<RefType<T>> {
  const timeRef = React.useRef<number | null>(null);

  function onKeydown(func: () => void): HotkeyCallback {
    return function (kvEvt: KeyboardEvent, hkEvt: HotkeysEvent) {
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
    preventDefault: true ,
    enabled: (kvEvt: KeyboardEvent, hkEvt: HotkeysEvent): boolean => {
      // This is needed as preventDefault in the option list below does not work with disabled hotkeys
      kvEvt.preventDefault();
      kvEvt.stopPropagation();
      
      const enabledOptions: Trigger | undefined = options?.enabled;
      if (enabledOptions === undefined) {
        return true;
      } else if (typeof enabledOptions === "function") {
        return enabledOptions(kvEvt, hkEvt);
      } else {
        return enabledOptions;
      }
    }
  }, dependencies);
}

export function useKeyName(key: string) {
  return useIsMacOS() ? key.replaceAll("Ctrl", "Ctrl") : key;
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
