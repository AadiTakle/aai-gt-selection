import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SurfacePlaceholder } from './surface-placeholder';

describe('application shell boundaries', () => {
  it('renders an eligibility-only placeholder', () => {
    render(<SurfacePlaceholder description="Synthetic surface" title="Family Portal" />);
    expect(screen.getByRole('heading', { name: 'Family Portal' })).toBeInTheDocument();
    expect(screen.getByText(/Eligibility only/)).toBeInTheDocument();
    expect(screen.queryByText(/admitted/i)).not.toBeInTheDocument();
  });
});
