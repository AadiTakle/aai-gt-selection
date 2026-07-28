import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ServedSingleSelect } from '@/lib/exam/item';

import { SingleSelectRenderer } from './single-select-renderer';

const served: ServedSingleSelect = {
  renderKind: 'single-select',
  itemId: 'SYN-VER-RELPAIR-01',
  typeCode: 'VER-RELPAIR-01',
  domain: 'verbal',
  title: 'Relation Match',
  blurb: 'Find the pair that relates the same way.',
  difficultyLevel: 4,
  content: {
    typeCode: 'VER-RELPAIR-01',
    prompt: 'Which word completes the second pair the same way?',
    stimulus: 'Bird is to Nest as Bee is to ___',
    options: [{ label: 'Hive' }, { label: 'Honey' }, { label: 'Wing' }],
  },
};

describe('SingleSelectRenderer', () => {
  it('captures the chosen index and reports a non-skipped outcome with a response time', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SingleSelectRenderer item={served} onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: /Honey/ }));
    await user.click(screen.getByRole('button', { name: /Submit answer/ }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const outcome = onComplete.mock.calls[0]![0];
    expect(outcome.response).toEqual({ selectedIndex: 1 });
    expect(outcome.skipped).toBe(false);
    expect(typeof outcome.responseTimeMs).toBe('number');
    expect(outcome.telemetry['M-REV']).toBe(0);
  });

  it('never reveals the answer key (renderable options carry only labels)', () => {
    render(<SingleSelectRenderer item={served} onComplete={vi.fn()} />);
    // No option exposes a lure/correct marker in the accessible tree.
    expect(screen.queryByText(/correct/i)).toBeNull();
    expect(screen.queryByText(/lure/i)).toBeNull();
  });

  it('counts a revision when the child changes answers before submitting', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SingleSelectRenderer item={served} onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: /Hive/ }));
    await user.click(screen.getByRole('button', { name: /Wing/ }));
    await user.click(screen.getByRole('button', { name: /Submit answer/ }));

    const outcome = onComplete.mock.calls[0]![0];
    expect(outcome.response).toEqual({ selectedIndex: 2 });
    expect(outcome.telemetry['M-REV']).toBe(1);
  });

  it('reports a skipped outcome via the skip control', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SingleSelectRenderer item={served} onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: /Skip this one/ }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ skipped: true, response: null }),
    );
  });
});
