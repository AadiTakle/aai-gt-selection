'use client';

/**
 * The local-synthetic backend has no "list my applications" RPC, so the client
 * remembers which application/profile it created for this browser. This is a
 * convenience for resume + dashboard lookup; a real deployment would
 * derive this from the authenticated session server-side.
 */

export const FAMILY_APPLICATION_STORAGE_KEY = 'gt-synthetic-family-application';

export type StoredApplication = {
  profileId: string;
  applicationId: string;
};

export function readStoredApplication(): StoredApplication | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(FAMILY_APPLICATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredApplication>;
    if (parsed.profileId && parsed.applicationId) {
      return { profileId: parsed.profileId, applicationId: parsed.applicationId };
    }
  } catch {
    return null;
  }
  return null;
}

export function storeApplication(value: StoredApplication): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FAMILY_APPLICATION_STORAGE_KEY, JSON.stringify(value));
}

/**
 * Full wizard-state snapshot for the no-backend preview, so navigating away
 * (e.g. to the dashboard and back via "Review your application") keeps every
 * answer. The real flow persists through the backend adapter instead.
 */
const PREVIEW_STATE_KEY = 'gt-synthetic-preview-wizard-state';

export function readPreviewState<T>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PREVIEW_STATE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writePreviewState(state: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREVIEW_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / serialization errors
  }
}
