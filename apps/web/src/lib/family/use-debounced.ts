'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

/** A debounced callback that also exposes a `cancel()` to drop any pending run. */
export type DebouncedCallback<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
};

/**
 * Returns a debounced wrapper around `callback`. The latest callback is always
 * invoked, and any pending timer is cleared on unmount so autosave never fires
 * after the wizard has gone away. Call `.cancel()` to drop a pending run — used
 * by submit so a queued autosave can't race the inline profile save.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): DebouncedCallback<Args> {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return useMemo(() => {
    const debounced = ((...args: Args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    }) as DebouncedCallback<Args>;
    debounced.cancel = cancel;
    return debounced;
  }, [delayMs, cancel]);
}
