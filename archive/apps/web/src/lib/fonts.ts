import { Inconsolata, Inter_Tight, Literata } from 'next/font/google';

// GT School's actual type system (scraped from gt.school's Webflow stylesheet):
// Literata (serif display) + Inter Tight (body) + Inconsolata (utility/labels).
// next/font self-hosts these at build time, preserving the strict CSP.
export const displayFont = Literata({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--gt-font-display-next',
  display: 'swap',
});

export const bodyFont = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--gt-font-body-next',
  display: 'swap',
});

export const utilityFont = Inconsolata({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--gt-font-utility-next',
  display: 'swap',
});
