import { LoginForm } from '@/components/auth/login-form';

export const dynamic = 'force-dynamic';

/**
 * Sign-in page. `requireRole` sends unauthenticated visitors here as
 * `/login?redirect=<attempted-path>`; after a successful sign-in the form
 * routes to that path (or the role's home).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  // only honor same-origin relative paths as a redirect target
  const safeRedirect =
    redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : undefined;
  return <LoginForm redirectTo={safeRedirect} />;
}
