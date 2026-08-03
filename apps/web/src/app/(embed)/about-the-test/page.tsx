import { AboutTheTest } from '@/components/family/about-the-test';

/**
 * Deliberately NOT behind `requireRole`. This page exists to explain the test to
 * someone deciding whether the product is for them, so gating it behind a login
 * would hide it from exactly the reader it is written for. It renders no
 * child-specific data, so there is nothing here to protect.
 */
export default function AboutTheTestPage() {
  return <AboutTheTest baselineHref="/family/assessment" />;
}
