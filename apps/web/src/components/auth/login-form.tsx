'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { homeForRole, parseUserRoleClaim } from '@/lib/role-claims';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import styles from './login-form.module.css';

/**
 * Sign-in surface for the portal. Two methods against Supabase Auth:
 *  - Password: for staff/seeded roles (and any family with a password).
 *  - Magic link: passwordless email link, nicer for families.
 *
 * On a successful password sign-in we read the role claim and route to that
 * role's home; unauthenticated visitors are sent here by requireRole via
 * `/login?redirect=<path>`.
 */

type Method = 'password' | 'magic';

export function LoginForm({ redirectTo }: { redirectTo?: string | undefined }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'working' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus('working');
    const supabase = createSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(mapError(signInError.message));
      setStatus('idle');
      return;
    }
    // route by role; fall back to a safe default or the requested redirect
    const role = parseUserRoleClaim(
      data.session?.user.app_metadata
        ? { app_metadata: data.session.user.app_metadata }
        : undefined,
    );
    const dest = redirectTo || (role.success ? homeForRole(role.data) : '/family');
    router.push(dest);
    router.refresh();
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus('working');
    const supabase = createSupabaseBrowserClient();
    const emailRedirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback${
            redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
          }`
        : '';
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
    });
    if (otpError) {
      setError(mapError(otpError.message));
      setStatus('idle');
      return;
    }
    setStatus('sent');
  }

  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>Family application portal</p>
      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.sub}>Welcome back. Choose how you’d like to sign in.</p>

      <div className={styles.tabs} role="tablist" aria-label="Sign-in method">
        <button
          type="button"
          role="tab"
          aria-selected={method === 'password'}
          className={`${styles.tab} ${method === 'password' ? styles.tabActive : ''}`}
          onClick={() => {
            setMethod('password');
            setError(null);
            setStatus('idle');
          }}
        >
          Password
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'magic'}
          className={`${styles.tab} ${method === 'magic' ? styles.tabActive : ''}`}
          onClick={() => {
            setMethod('magic');
            setError(null);
            setStatus('idle');
          }}
        >
          Magic link
        </button>
      </div>

      {status === 'sent' ? (
        <div className={styles.sentNote} role="status">
          <p className={styles.sentTitle}>Check your email</p>
          <p>
            We sent a sign-in link to <strong>{email}</strong>. Open it on this device to continue.
          </p>
        </div>
      ) : method === 'password' ? (
        <form className={styles.form} onSubmit={signInPassword}>
          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </label>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <button className={styles.submit} type="submit" disabled={status === 'working'}>
            {status === 'working' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : (
        <form className={styles.form} onSubmit={sendMagicLink}>
          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <button className={styles.submit} type="submit" disabled={status === 'working'}>
            {status === 'working' ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          <p className={styles.hint}>No password needed. We’ll email you a secure link.</p>
        </form>
      )}
    </div>
  );
}

/** Turn Supabase's raw messages into something a family can act on. */
function mapError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return 'That email or password doesn’t match. Please try again.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'Please confirm your email first, then sign in.';
  }
  if (/rate limit/i.test(message)) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return 'We couldn’t sign you in. Please try again.';
}
