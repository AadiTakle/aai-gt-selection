import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AssessmentGate } from './assessment-gate';

afterEach(() => {
  cleanup();
});

describe('AssessmentGate', () => {
  it('stays locked before submission', () => {
    render(<AssessmentGate enabled={false} assessmentHref="/family/assessment" />);
    expect(screen.getByText(/submit your application first/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('links to the assessment page once enabled (fee shown there, not here)', () => {
    render(<AssessmentGate enabled assessmentHref="/family/assessment" />);
    const link = screen.getByRole('link', { name: /continue to the assessment/i });
    expect(link).toHaveAttribute('href', '/family/assessment');
    // fee is advertised on the assessment page, not on the dashboard gate
    expect(screen.queryByText(/\$75/)).not.toBeInTheDocument();
  });
});
