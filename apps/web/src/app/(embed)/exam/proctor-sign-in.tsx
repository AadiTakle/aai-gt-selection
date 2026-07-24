'use client';

import { useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

/**
 * Dev-only convenience sign-in for the born-synthetic proctor account created by
 * `pnpm db:users` (admissions_operator). Not a production auth surface.
 */
export function ProctorSignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admissions@example.test',
      password: 'Synthetic-Only-2026!',
    });
    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return (
    <main style={{ maxWidth: '32rem', margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '1.4rem' }}>Adaptive Screening (synthetic)</h1>
      <p style={{ color: '#475569', lineHeight: 1.5 }}>
        This born-synthetic prototype is proctor-operated. Sign in as the synthetic
        <code> admissions_operator</code> to run an adaptive session.
      </p>
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        style={{
          marginTop: '1rem',
          padding: '0.6rem 1rem',
          borderRadius: 8,
          border: 'none',
          background: '#4f46e5',
          color: 'white',
          fontSize: '0.95rem',
          cursor: busy ? 'default' : 'pointer',
        }}
      >
        {busy ? 'Signing in…' : 'Sign in as synthetic proctor'}
      </button>
      {error ? <p style={{ color: '#b91c1c', marginTop: '0.75rem' }}>{error}</p> : null}
      <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '1.5rem' }}>
        Requires the local synthetic users (<code>pnpm db:users</code>). No live data.
      </p>
    </main>
  );
}
