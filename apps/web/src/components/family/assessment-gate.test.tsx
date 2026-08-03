import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AssessmentGate } from './assessment-gate';

afterEach(() => {
  cleanup();
});

/**
 * These assertions were rewritten for the pivot (2026-08-03, see
 * `docs/product/COGAT_PREP_PIVOT.md` §7.1) rather than adjusted. They previously
 * pinned admissions behavior — "submit your application first", "continue to the
 * assessment", and the absence of the $75 fee *on this card* — and each is a
 * statement about a product that no longer exists. The fee one especially is not
 * something to relax: it asserted the price was advertised elsewhere, and there
 * is no longer anywhere for it to be advertised.
 */
describe('AssessmentGate', () => {
  it('stays locked, with no link, until the child details exist', () => {
    render(<AssessmentGate enabled={false} assessmentHref="/family/assessment" />);
    expect(screen.getByText(/add your child’s details first/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('invites a first baseline once enabled, and names no price anywhere', () => {
    render(<AssessmentGate enabled assessmentHref="/family/assessment" />);
    const link = screen.getByRole('link', { name: /start the baseline/i });
    expect(link).toHaveAttribute('href', '/family/assessment');
    // The baseline is free, so no amount and no fee language belongs here.
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/fee|pay/i)).not.toBeInTheDocument();
  });

  /**
   * The retake is the product's actual measurement — a before/after on the same
   * battery is the one comparison the change literature supports (§5) — so this
   * card has to invite it rather than treat a second sitting as an edge case.
   */
  it('invites a retake once a baseline has been taken', () => {
    render(<AssessmentGate enabled taken assessmentHref="/family/assessment" />);
    expect(screen.getByRole('link', { name: /retake the baseline/i })).toBeInTheDocument();
    expect(screen.getByText(/what has actually moved/i)).toBeInTheDocument();
  });
  /**
   * The dashboard is where most people land, so a link that only exists on the
   * baseline page one click deeper is a link most people never see. It is offered
   * in every state, including locked: someone who cannot start yet is exactly who
   * benefits from reading about the test first.
   */
  it('offers the explainer in every state, locked included', () => {
    const { unmount } = render(
      <AssessmentGate
        enabled={false}
        assessmentHref="/family/assessment"
        aboutHref="/about-the-test"
      />,
    );
    expect(screen.getByRole('link', { name: /what is the cogat/i })).toHaveAttribute(
      'href',
      '/about-the-test',
    );
    unmount();

    for (const taken of [false, true]) {
      const view = render(
        <AssessmentGate
          enabled
          taken={taken}
          assessmentHref="/family/assessment"
          aboutHref="/about-the-test"
        />,
      );
      expect(screen.getByRole('link', { name: /what is the cogat/i })).toBeInTheDocument();
      view.unmount();
    }
  });
});
