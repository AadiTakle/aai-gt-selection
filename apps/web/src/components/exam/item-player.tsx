'use client';

import type { ServedItem } from '@/lib/exam/item';
import type { PlayerOutcome } from '@/lib/exam/session';

import { EmbeddedDemoRenderer } from './renderers/embedded-demo-renderer';
import { SingleSelectRenderer } from './renderers/single-select-renderer';

/**
 * The reusable item player: given ANY served item, it renders the item by its
 * `renderKind` and reports the child's raw response + per-item response time +
 * telemetry through `onComplete`. It is the generalization of the old
 * hard-coded iframe path in `exam-runner` — new item types are added by
 * registering another renderer here, with no change to the session shell.
 *
 * The player is deliberately unaware of scoring, sequencing, and persistence.
 */
export interface ItemPlayerProps {
  item: ServedItem;
  onComplete: (outcome: PlayerOutcome) => void;
  /**
   * Optional class for the embedded-demo iframe, so hosts can match their
   * layout. Omitting it is safe: the renderer falls back to its own branded
   * frame rather than an unstyled iframe.
   */
  frameClassName?: string | undefined;
}

export function ItemPlayer({ item, onComplete, frameClassName }: ItemPlayerProps) {
  switch (item.renderKind) {
    case 'single-select':
      return <SingleSelectRenderer key={item.itemId} item={item} onComplete={onComplete} />;
    case 'embedded-demo':
      return (
        <EmbeddedDemoRenderer
          key={item.itemId}
          item={item}
          onComplete={onComplete}
          className={frameClassName}
        />
      );
    default: {
      // Exhaustiveness guard: a new renderKind must add a renderer above.
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}
