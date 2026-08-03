import { notFound } from 'next/navigation';

import { AboutTheTest } from '@/components/family/about-the-test';

// Dev-only preview of the explainer, matching the other family-preview routes.
export default function AboutTheTestPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <AboutTheTest baselineHref="/dev/family-preview/assessment" />;
}
