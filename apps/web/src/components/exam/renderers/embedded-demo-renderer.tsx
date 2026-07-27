'use client';

import { useEffect, useRef } from 'react';

import { isDemoDone, readMetrics } from '@/lib/exam/harvest';
import type { ServedEmbeddedDemo } from '@/lib/exam/item';
import type { PlayerOutcome } from '@/lib/exam/session';

import { EXAM_SKIP_EVENT } from '../player-events';

const MAX_MS_PER_ITEM = 4 * 60 * 1000; // safety valve so a stuck item can't wedge the flow
const POLL_MS = 400;

/**
 * Renderer for a self-contained, same-origin iframe demo (the existing runtime).
 * The demo self-renders and self-scores; we poll its DOM until it reaches its
 * "done" phase, then harvest the on-screen `M-*` telemetry. Ported verbatim from
 * the original `exam-runner` running-phase so behavior is unchanged — only now it
 * lives behind the generic player + shell.
 */
export function EmbeddedDemoRenderer({
  item,
  onComplete,
  className,
}: {
  item: ServedEmbeddedDemo;
  onComplete: (outcome: PlayerOutcome) => void;
  className?: string | undefined;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const startedItemAt = Date.now();
    let stopped = false;

    const finishItem = (skipped: boolean) => {
      if (stopped) return;
      stopped = true;
      const doc = iframeRef.current?.contentDocument;
      const metrics = doc ? readMetrics(doc) : {};
      onComplete({
        response: null, // the raw response lives inside the demo; it self-scores
        telemetry: metrics,
        responseTimeMs: Date.now() - startedItemAt,
        skipped,
      });
    };

    const timer = window.setInterval(() => {
      const doc = iframeRef.current?.contentDocument;
      if (doc && isDemoDone(doc)) {
        window.clearInterval(timer);
        finishItem(false);
      } else if (Date.now() - startedItemAt > MAX_MS_PER_ITEM) {
        window.clearInterval(timer);
        finishItem(true); // timed out → record what we can, mark skipped
      }
    }, POLL_MS);

    const onSkip = () => {
      window.clearInterval(timer);
      finishItem(true);
    };
    window.addEventListener(EXAM_SKIP_EVENT, onSkip);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(EXAM_SKIP_EVENT, onSkip);
    };
  }, [onComplete]);

  return (
    <iframe
      ref={iframeRef}
      title={`${item.title} question`}
      src={item.demoPath}
      className={className}
    />
  );
}
