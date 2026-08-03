import { notFound } from 'next/navigation';

import { AssessmentPage } from '@/components/family/assessment-page';

// Dev-only preview of the assessment page.
export default function FamilyAssessmentPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AssessmentPage
      dashboardHref="/dev/family-preview/dashboard"
      examHref="/dev/family-preview/exam"
      aboutHref="/dev/family-preview/about-the-test"
    />
  );
}
