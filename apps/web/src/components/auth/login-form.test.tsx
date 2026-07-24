import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// next/navigation is not available in jsdom; stub the router hook.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// the browser Supabase client reads env + hits the network; stub it out.
vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

import { LoginForm } from './login-form';

afterEach(() => {
  cleanup();
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
});
