'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ServedSingleSelect } from '@/lib/exam/item';
import type { MetricMap } from '@/lib/exam/types';
import type { PlayerOutcome } from '@/lib/exam/session';

import { EXAM_SKIP_EVENT } from '../player-events';
import styles from './single-select-renderer.module.css';

/**
 * Native renderer for a keyed single-select item. It captures ONLY the child's
 * raw response (which option index) plus behavioral telemetry (per-item response
 * time, first-action latency, answer revisions). It never sees or checks the
 * answer key — scoring happens later from the bank item (see `scoring.ts`). This
 * is the "content is renderer-agnostic" + "key never reaches the browser"
 * posture of EXAM_ITEM_SCHEMA_SPEC §4.
 *
 * State resets per item because the player mounts this with a `key={itemId}`.
 */
export function SingleSelectRenderer({
  item,
  onComplete,
}: {
  item: ServedSingleSelect;
  onComplete: (outcome: PlayerOutcome) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const firstLatencyRef = useRef<number | null>(null);
  const revisionsRef = useRef(0);
  const doneRef = useRef(false);

  const optionCount = item.content.options.length;

  // Mark the present time after mount (never during render) so response-time and
  // first-action latency are measured from when the item became interactive.
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const complete = useCallback(
    (skipped: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      const sel = selectedRef.current;
      const startedAt = startedAtRef.current ?? Date.now();
      const telemetry: MetricMap = { 'M-REV': revisionsRef.current };
      if (firstLatencyRef.current != null) {
        telemetry['M-RTFIRST'] = `${firstLatencyRef.current} ms`;
      }
      onComplete({
        response: sel != null ? { selectedIndex: sel } : null,
        telemetry,
        responseTimeMs: Date.now() - startedAt,
        skipped,
      });
    },
    [onComplete],
  );

  const choose = useCallback((idx: number) => {
    if (doneRef.current) return;
    if (firstLatencyRef.current == null) {
      firstLatencyRef.current = Date.now() - (startedAtRef.current ?? Date.now());
    }
    const prev = selectedRef.current;
    if (prev != null && prev !== idx) revisionsRef.current += 1;
    selectedRef.current = idx;
    setSelected(idx);
  }, []);

  const submit = useCallback(() => {
    if (selectedRef.current == null) return;
    complete(false);
  }, [complete]);

  // Keyboard: number keys select, Enter submits (mirrors the iframe demos).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (doneRef.current) return;
      if (/^[1-9]$/.test(event.key)) {
        const idx = Number(event.key) - 1;
        if (idx < optionCount) choose(idx);
      } else if (event.key === 'Enter') {
        submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, submit, optionCount]);

  // Header "Skip" affordance bridges in through a window event.
  useEffect(() => {
    const onSkip = () => complete(true);
    window.addEventListener(EXAM_SKIP_EVENT, onSkip);
    return () => window.removeEventListener(EXAM_SKIP_EVENT, onSkip);
  }, [complete]);

  return (
    <div className={styles.item}>
      <p className={styles.prompt}>{item.content.prompt}</p>
      {item.content.stimulus ? <p className={styles.stimulus}>{item.content.stimulus}</p> : null}

      <div className={styles.options} role="group" aria-label={item.content.prompt}>
        {item.content.options.map((option, idx) => {
          const isSelected = selected === idx;
          return (
            <button
              key={`${item.itemId}-${idx}`}
              type="button"
              className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
              aria-pressed={isSelected}
              onClick={() => choose(idx)}
            >
              <span className={styles.optionKey} aria-hidden="true">
                {idx + 1}
              </span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.submit} ${selected == null ? styles.submitDisabled : ''}`}
          disabled={selected == null}
          onClick={submit}
        >
          Submit answer
        </button>
        <button
          type="button"
          className={styles.skip}
          onClick={() => complete(true)}
        >
          Skip this one →
        </button>
      </div>

      <p className={styles.hint}>Tip: press 1–{optionCount} to choose, Enter to submit.</p>
    </div>
  );
}
