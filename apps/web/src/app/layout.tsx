import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SessionControls } from '@/components/auth/session-controls';
import { GtLogo } from '@/components/gt-logo';
import { StaleActionReloadGuard } from '@/components/stale-action-reload-guard';
import { bodyFont, displayFont, utilityFont } from '@/lib/fonts';
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
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${utilityFont.variable}`}
    >
      <body>
        <StaleActionReloadGuard />
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
