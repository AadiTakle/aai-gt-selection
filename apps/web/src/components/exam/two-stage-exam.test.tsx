import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TwoStageExam } from './two-stage-exam';

/**
 * Sanity check that the PROPOSED two-stage demo surface mounts and is loudly
 * labelled as an unapproved proposal before any interaction. Full click-through
 * (which posts to /api/exam-results) is exercised by the pure sequencer tests via
 * `driveSession`; this only guards that the component + page compile and render.
 */
describe('TwoStageExam (intro)', () => {
  it('renders the proposal labeling and both regime chips', () => {
    render(<TwoStageExam />);
    expect(screen.getByText(/Proposed · unapproved · not merged/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 1 · Standing/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 2 · Learning-rate/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start the proposed demo/i })).toBeInTheDocument();
  });

  it('states the born-synthetic, non-decision boundary up front', () => {
    render(<TwoStageExam />);
    expect(screen.getAllByText(/validated=false/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/never an admission/i)).toBeInTheDocument();
  });
});
