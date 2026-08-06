'use client';

import { usePathname } from 'next/navigation';

import { SessionControls } from '@/components/auth/session-controls';

/**
 * The right-hand side of the app header, which is not the same on every surface.
 *
 * Everywhere else this is an admissions portal and says so. On the public screener it must not: the
 * page exists to be opened by a child whose family has no application and may not know GT, and
 * "Admissions Portal" above a set of puzzles reframes them as an entrance exam before the first
 * question. The sign-in control goes with it, because there is no account to sign in to and offering
 * one implies the session is being attached to a record.
 *
 * Done by pathname rather than by passing the surface down, because the header lives in the ROOT
 * layout — a nested layout composes with it rather than replacing it, so there is no way for a route
 * to opt out of its own wrapper. See `lib/exam/surfaces.ts` for the rest of what varies per door.
 */
const SCREENER_PATHS = ['/screener', '/dev/family-preview/screener'];

export function AppHeaderRight() {
  const pathname = usePathname() ?? '';
  const isScreener = SCREENER_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isScreener) return <strong>GT School</strong>;

  return (
    <>
      <strong>GT School Admissions Portal</strong>
      <SessionControls />
    </>
  );
}
