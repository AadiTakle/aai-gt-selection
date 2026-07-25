import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// next/navigation is not available in jsdom; stub the router hook.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// the browser Supabase client reads env + hits the network; stub it out. `signUp`
// and `signInWithPassword` are module-level spies so tests can assert on / override
// their resolution.
const signUpMock = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
const signInWithPasswordMock = vi.fn().mockResolvedValue({
  data: { session: { user: { app_metadata: { user_role: 'family' } } } },
  error: null,
});
vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      signUp: signUpMock,
    },
  }),
}));

import { LoginForm } from './login-form';

afterEach(() => {
  cleanup();
  signUpMock.mockClear();
  signUpMock.mockResolvedValue({ data: { session: null }, error: null });
  signInWithPasswordMock.mockClear();
  signInWithPasswordMock.mockResolvedValue({
    data: { session: { user: { app_metadata: { user_role: 'family' } } } },
    error: null,
  });
});

describe('LoginForm', () => {
  it('defaults to password sign-in with email + password fields', () => {
    render(<LoginForm />);
    expect(screen.getByRole('tab', { name: /password/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  it('switches to the magic-link method (no password field, link CTA)', () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('tab', { name: /magic link/i }));
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /email me a sign-in link/i })).toBeInTheDocument();
  });

  it('opens the create-account view with email + password + confirm fields', () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /new family\? create an account/i }));
    expect(
      screen.getByRole('heading', { name: /create your family account/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^create account$/i })).toBeInTheDocument();
  });

  it('carries a synthetic-only notice and never uses admitted language', () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /new family\? create an account/i }));
    expect(screen.getByText(/synthetic-only prototype/i)).toBeInTheDocument();
    expect(screen.queryByText(/admitted/i)).not.toBeInTheDocument();
  });

  it('blocks submission and does not call signUp when passwords do not match', () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /new family\? create an account/i }));
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'you+gt@gmail.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'abcdef1' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'abcdef2' } });
    fireEvent.click(screen.getByRole('button', { name: /^create account$/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/don’t match/i);
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('offers a one-click guest login that signs in as the synthetic demo family', async () => {
    render(<LoginForm />);
    const guest = screen.getByRole('button', { name: /continue as guest/i });
    expect(guest).toBeInTheDocument();
    expect(screen.queryByText(/admitted/i)).not.toBeInTheDocument();
    fireEvent.click(guest);
    await waitFor(() =>
      expect(signInWithPasswordMock).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'family@example.test' }),
      ),
    );
  });

  it('shows the confirm-your-email state after a signup with no session', async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /new family\? create an account/i }));
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'you+gt@gmail.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'abcdef1' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'abcdef1' } });
    fireEvent.click(screen.getByRole('button', { name: /^create account$/i }));
    expect(await screen.findByText(/confirm your email/i)).toBeInTheDocument();
    expect(signUpMock).toHaveBeenCalledOnce();
  });
});
