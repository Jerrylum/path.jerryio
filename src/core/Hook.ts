import { runInAction, action } from "mobx";
import React, { DependencyList } from "react";
import { Options, useHotkeys } from "react-hotkeys-hook";
import { RefType, HotkeyCallback, HotkeysEvent, Trigger } from "react-hotkeys-hook/dist/types";
import { getAppStores } from "./MainApp";
import { Vector } from "./Path";
import { IS_MAC_OS } from "./Util";
import { TouchEventListener } from "./TouchEventListener";

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
        
        Last but not least, do not debounce MacOS meta hotkeys.
        See: https://stackoverflow.com/questions/11818637/why-does-javascript-drop-keyup-events-when-the-metakey-is-pressed-on-mac-browser
        
        The debounce times are randomly chosen.
        */

      const isMacMetaHotkey = IS_MAC_OS && kvEvt.metaKey;

      if (kvEvt.type === "keyup") {
        timeRef.current = null;
      } else if (kvEvt.type === "keydown") {
        if (timeRef.current === null || Date.now() - timeRef.current > (isMacMetaHotkey ? 200 : 800)) {
          runInAction(func);
          timeRef.current = Date.now();
        } else if (isMacMetaHotkey === false) {
          timeRef.current = Date.now();
        }
      }
    };
  }

  return useHotkeys(
    keys,
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

export function useUnsavedChangesPrompt() {
  const { app } = getAppStores();

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
  function getSize(): Vector {
    // UX: innerHeight is only used in the first render
    // UX: clientWidth is better than innerWidth because it is accurate when the web page is zoomed
    return new Vector(document.body.clientWidth || window.innerWidth, document.body.clientHeight || window.innerHeight);
  }

  const [size, setSize] = React.useState<Vector>(getSize());

  React.useEffect(() => {
    const onResize = () => {
      const newSize = getSize();

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
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => {
      setIsDraggingFile("Files" in e.dataTransfer.types);
    },
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
      setIsDraggingFile(false);
    },
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

export function useClipboardPasteText(element: HTMLElement, onPaste: (text: string, e: ClipboardEvent) => void) {
  React.useEffect(() => {
    const callback = action((e: ClipboardEvent) => {
      if (e.clipboardData === null) return;
      const text = e.clipboardData.getData("text/plain");
      if (text === "") return;
      onPaste(text, e);
    });

    document.addEventListener("paste", callback);

    return () => {
      document.removeEventListener("paste", callback);
    };
  }, [element, onPaste]);
}

export namespace Custom {
  // See: https://github.com/microsoft/TypeScript/issues/33047

  export type EventMap<T extends EventTarget> = T extends MediaQueryList
    ? MediaQueryListEventMap
    : T extends Document
    ? DocumentEventMap
    : T extends Window
    ? WindowEventMap
    : HTMLElementEventMap & { [key: string]: Event };

  export type EventType<T extends EventTarget> = keyof EventMap<T> & string;

  export type EventListener<
    TEventTarget extends EventTarget,
    TEventType extends keyof Custom.EventMap<TEventTarget>
  > = (this: TEventTarget, ev: Custom.EventMap<TEventTarget>[TEventType]) => any;
}

export function useEventListener<TEventTarget extends EventTarget, TEventType extends Custom.EventType<TEventTarget>>(
  eventTarget: TEventTarget | null,
  eventType: TEventType,
  listener: Custom.EventListener<TEventTarget, TEventType>,
  options?: boolean | AddEventListenerOptions
) {
  React.useEffect(() => {
    const eventListener = action(listener);
    eventTarget?.addEventListener(eventType, eventListener as any, options);

    return () => {
      eventTarget?.removeEventListener(eventType, eventListener as any, options);
    };
  }, [eventTarget, eventType, listener, options]);
}

export function useMobxStorage<T extends { destructor: () => void } | {}>(
  factory: () => T,
  deps: React.DependencyList = []
): T {
  const storage = React.useMemo(() => factory(), deps);
  React.useEffect(() => {
    return () => {
      if ("destructor" in storage && typeof storage.destructor === "function") storage.destructor?.();
    };
  }, deps);

  return storage;
}

export function useTouchEvent(eventListener: TouchEventListener, element: HTMLElement | null) {
  useEventListener(element, "touchstart", (e) => eventListener.onTouchStart(e), { capture: true, passive: false });
  useEventListener(element, "touchmove", (e) => eventListener.onTouchMove(e), { capture: true, passive: false });
  useEventListener(element, "touchend", (e) => eventListener.onTouchEnd(e), { capture: true, passive: false });
}
