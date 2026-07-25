'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { homeForRole, parseUserRoleClaim } from '@/lib/role-claims';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import styles from './login-form.module.css';

/**
 * Sign-in surface for the portal. Sign-in offers two methods against Supabase
 * Auth:
 *  - Password: for staff/seeded roles (and any family with a password).
 *  - Magic link: passwordless email link, nicer for families.
 *
 * Families with no account yet can switch to a self-service "Create account"
 * view (`signup` mode) that calls `supabase.auth.signUp`. New accounts are always
 * assigned the `family` role server-side by a DB trigger — clients cannot set a
 * role — so a self-registrant can only ever be a family, never staff.
 *
 * On a successful password sign-in (or auto-confirmed sign-up) we read the role
 * claim and route to that role's home; unauthenticated visitors are sent here by
 * requireRole via `/login?redirect=<path>`.
 */

/**
 * Synthetic-only guest login. One click signs in as the shared demo family
 * account (family role, synthetic data) so visitors can reach the portal
 * without email confirmation — handy when transactional email is degraded.
 * This is intentionally public and is NOT a real credential: the account holds
 * only synthetic data and has the lowest-privilege (family) role.
 */
const GUEST_EMAIL = 'family@example.test';
const GUEST_PASSWORD = 'Synthetic-Only-2026!';

type Method = 'password' | 'magic' | 'signup';

export function LoginForm({ redirectTo }: { redirectTo?: string | undefined }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'working' | 'sent' | 'needs-confirmation'>('idle');
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
    routeByRole(data.session?.user.app_metadata);
  }

  /** Route to the signed-in user's role home (or the requested redirect). */
  function routeByRole(appMetadata: unknown) {
    const role = parseUserRoleClaim(appMetadata ? { app_metadata: appMetadata } : undefined);
    const dest = redirectTo || (role.success ? homeForRole(role.data) : '/family');
    router.push(dest);
    router.refresh();
  }

  /**
   * One-click guest entry: sign in as the synthetic demo family account. Uses
   * the ordinary password grant, so it yields a real family-role session and
   * every route guard stays intact — no email confirmation required.
   */
  async function signInAsGuest() {
    setError(null);
    setStatus('working');
    const supabase = createSupabaseBrowserClient();
    const { data, error: guestError } = await supabase.auth.signInWithPassword({
      email: GUEST_EMAIL,
      password: GUEST_PASSWORD,
    });
    if (guestError) {
      setError('Guest access is unavailable right now. Please try again in a moment.');
      setStatus('idle');
      return;
    }
    routeByRole(data.session?.user.app_metadata);
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Those passwords don’t match. Please re-enter them.');
      return;
    }
    setStatus('working');
    const supabase = createSupabaseBrowserClient();
    const emailRedirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback${
            redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
          }`
        : '';
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
    });
    if (signUpError) {
      setError(mapError(signUpError.message));
      setStatus('idle');
      return;
    }
    // With email confirmation on, no session is returned yet — the family must
    // open the link we email them. If the project auto-confirms, a session comes
    // back and we can route straight to the (family) role home. The role claim is
    // stamped server-side by the signup trigger, so it is already present here.
    if (data.session) {
      routeByRole(data.session.user.app_metadata);
      return;
    }
    setStatus('needs-confirmation');
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

  const isSignup = method === 'signup';
  const showCard = status === 'sent' || status === 'needs-confirmation';

  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>Family application portal</p>
      <h1 className={styles.title}>{isSignup ? 'Create your family account' : 'Sign in'}</h1>
      <p className={styles.sub}>
        {isSignup
          ? 'Set up a family login to start an eligibility application.'
          : 'Welcome back. Choose how you’d like to sign in.'}
      </p>

      {!isSignup && !showCard ? (
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
      ) : null}

      {status === 'sent' ? (
        <div className={styles.sentNote} role="status">
          <p className={styles.sentTitle}>Check your email</p>
          <p>
            We sent a sign-in link to <strong>{email}</strong>. Open it on this device to continue.
          </p>
        </div>
      ) : status === 'needs-confirmation' ? (
        <div className={styles.sentNote} role="status">
          <p className={styles.sentTitle}>Confirm your email</p>
          <p>
            We sent a confirmation link to <strong>{email}</strong>. Open it on this device to
            finish creating your account, then sign in.
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
      ) : method === 'magic' ? (
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
      ) : (
        <form className={styles.form} onSubmit={signUp}>
          <p className={styles.notice} role="note">
            Synthetic-only prototype — please don’t enter real personal information. Use a throwaway
            email you can receive mail at (for example <code>you+gt@gmail.com</code>).
          </p>
          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you+gt@gmail.com"
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </label>
          <label className={styles.label}>
            Confirm password
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
            />
          </label>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <button className={styles.submit} type="submit" disabled={status === 'working'}>
            {status === 'working' ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}

      {!showCard ? (
        <>
          <div className={styles.divider}>
            <span>or</span>
          </div>
          <button
            type="button"
            className={styles.guest}
            onClick={signInAsGuest}
            disabled={status === 'working'}
          >
            Continue as guest
          </button>
          <p className={styles.hint}>
            Explore the portal instantly with a synthetic demo family — no email needed.
          </p>
        </>
      ) : null}

      {!showCard ? (
        <button
          type="button"
          className={styles.switchMode}
          onClick={() => {
            setMethod(isSignup ? 'password' : 'signup');
            setError(null);
            setStatus('idle');
            setPassword('');
            setConfirmPassword('');
          }}
        >
          {isSignup ? 'Already have an account? Sign in' : 'New family? Create an account'}
        </button>
      ) : null}
    </div>
  );
}

/** Turn Supabase's raw messages into something a family can act on. */
function mapError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return 'That email or password doesn’t match. Please try again.';
  }
  if (/already registered|user already exists|already been registered/i.test(message)) {
    return 'An account with that email already exists. Try signing in instead.';
  }
  if (/password/i.test(message) && /least|weak|short|characters/i.test(message)) {
    return 'Please choose a longer password (at least 6 characters).';
  }
  if (/email address.*invalid|invalid.*email|valid email/i.test(message)) {
    return 'Please enter a valid, deliverable email address.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'Please confirm your email first, then sign in.';
  }
  if (/rate limit|too many/i.test(message)) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return 'Something went wrong. Please try again.';
}
