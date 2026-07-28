'use client';

import { useEffect } from 'react';

import { isStaleServerActionError, reloadForStaleServerAction } from '@/lib/stale-action-reload';

/**
 * Catches the framework-level "Failed to find Server Action" error that a tab
 * left open across a deploy hits, and reloads once to pick up the new bundle.
 * Mounted app-wide so it covers every action (autosave, submit, sign-out …),
 * not just the paths that catch their own errors. Renders nothing.
 */
export function StaleActionReloadGuard() {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = typeof reason === 'string' ? reason : reason?.message;
      if (isStaleServerActionError(message)) reloadForStaleServerAction();
    };
    const onError = (event: ErrorEvent) => {
      if (isStaleServerActionError(event.message || event.error?.message)) {
        reloadForStaleServerAction();
      }
    };
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  return null;
}
