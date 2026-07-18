import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SyntheticPrototypeBanner } from '@/components/synthetic-prototype-banner';
import '@/styles/globals.css';

export const metadata: Metadata = {
  description: 'Synthetic GT admissions application architecture shell.',
  title: 'GT Admissions Prototype',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SyntheticPrototypeBanner />
        <div className="app-shell">
          <header className="app-header">
            <strong>GT Admissions Prototype</strong>
            <a href={process.env.NEXT_PUBLIC_GT_RETURN_URL ?? '/'}>Return to GT website</a>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
