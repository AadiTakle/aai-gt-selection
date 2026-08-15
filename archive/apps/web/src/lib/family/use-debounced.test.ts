import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedCallback } from './use-debounced';

describe('useDebouncedCallback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs the callback once after the delay, with the latest args', () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 1200));

    act(() => {
      result.current('a');
      result.current('b');
    });
    expect(spy).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1200));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('b');
  });

  it('cancel() drops a pending run so it never fires', () => {
    // Guards the submit race: a queued autosave must not run after submit
    // cancels it and takes over the profile save inline.
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 1200));

    act(() => {
      result.current('queued');
      result.current.cancel();
      vi.advanceTimersByTime(5000);
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
