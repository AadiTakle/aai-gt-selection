'use client';

import { useEffect, useState } from 'react';

import styles from './session-controls.module.css';

/**
 * Header session control: shows a "Sign out" button only when a session exists.
 * Reads the existing /api/session endpoint (no new server surface). Rendered in
 * the root header so it appears across the authenticated app but stays quiet on
 * the login page and for anonymous visitors.
 */
export function SessionControls() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/session')
      .then((r) => (r.ok ? r.json() : { authenticated: false }))
      .then((data: { authenticated?: boolean }) => {
        if (active) setAuthenticated(Boolean(data.authenticated));
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!authenticated) return null;

  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className={styles.signout}>
        Sign out
      </button>
    </form>
  );
}
