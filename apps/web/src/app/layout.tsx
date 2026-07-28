import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// GT School type system, self-hosted locally as packages (no remote stylesheet):
// Literata (display) + Inter Tight (body) + Inconsolata (utility marks).
import '@fontsource-variable/literata';
import '@fontsource-variable/inter-tight';
import '@fontsource-variable/inconsolata';

import { SessionControls } from '@/components/auth/session-controls';
import { GtLogo } from '@/components/gt-logo';
import '@/styles/globals.css';

export const metadata: Metadata = {
  description: 'GT School family admissions application.',
  title: 'GT School Admissions',
};

const GT_WEBSITE = 'https://gt.school';

function returnUrl(): string {
  const configured = process.env.NEXT_PUBLIC_GT_RETURN_URL;
  // fall back to the real GT site when the env is unset or a local placeholder
  if (!configured || configured.includes('127.0.0.1') || configured.includes('localhost')) {
    return GT_WEBSITE;
  }
  return configured;
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <a
              className="gt-brand-link"
              href={returnUrl()}
              target="_blank"
              rel="noreferrer"
              aria-label="Visit the GT School website"
            >
              <GtLogo height={28} />
            </a>
            <span className="app-header-right">
              <strong>GT School Admissions Portal</strong>
              <SessionControls />
            </span>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
