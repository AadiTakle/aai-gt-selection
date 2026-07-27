'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { toServedItem, type BankItem, type ServedItem } from '@/lib/exam/item';
import { buildItemResult, nextBankItem, summarize, type PlayerOutcome } from '@/lib/exam/session';
import type { Sequencer } from '@/lib/exam/sequencer';
import type { ExamItemResult, ExamSummary } from '@/lib/exam/types';

export type ExamSessionPhase = 'intro' | 'running' | 'saving' | 'done' | 'error';

export interface UseExamSessionOptions {
  bank: readonly BankItem[];
  /** The pluggable sequencing strategy. Swap this one value to change structure. */
  sequencer: Sequencer;
  studentName: string;
  ageBand?: string;
  endpoint?: string;
  /** If set, mirror the summary to localStorage under this key. */
  resultsStorageKey?: string;
}

export interface UseExamSession {
  phase: ExamSessionPhase;
  currentItem: ServedItem | null;
  answeredCount: number;
  totalPlanned: number;
  /** Per-item results recorded so far (raw response + response time + telemetry). */
  results: ExamItemResult[];
  summary: ExamSummary | null;
  error: string | null;
  start: () => void;
  handleOutcome: (outcome: PlayerOutcome) => void;
  retry: () => void;
}

function randomCode(prefix: string): string {
  // born-synthetic, PII-free code
  return `${prefix}-SYN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * React binding for the session shell (`lib/exam/session.ts`). It owns phase
 * transitions and server persistence; it delegates *which item is next* to the
 * injected {@link Sequencer} and *how an item is answered* to the player. It is
 * used by both the family iframe battery and the native synthetic demo, proving
 * the shell is item- and structure-agnostic.
 */
export function useExamSession({
  bank,
  sequencer,
  studentName,
  ageBand = '4-5',
  endpoint = '/api/exam-results',
  resultsStorageKey,
}: UseExamSessionOptions): UseExamSession {
  const [phase, setPhase] = useState<ExamSessionPhase>('intro');
  const [currentItem, setCurrentItem] = useState<ServedItem | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [results, setResults] = useState<ExamItemResult[]>([]);
  const [summary, setSummary] = useState<ExamSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef({ sessionId: '', participantCode: '', startedAt: '' });
  const resultsRef = useRef<ExamItemResult[]>([]);
  const presentedRef = useRef<string[]>([]);
  const currentBankItemRef = useRef<BankItem | null>(null);
  const lockRef = useRef(false);
  // Latest finalize, so handleOutcome can call it without a dependency cycle.
  const finalizeRef = useRef<(items: ExamItemResult[]) => void>(() => {});

  const present = useCallback((item: BankItem) => {
    currentBankItemRef.current = item;
    setCurrentItem(toServedItem(item));
    lockRef.current = false;
  }, []);

  const finalize = useCallback(
    async (items: ExamItemResult[]) => {
      setPhase('saving');
      const payload = {
        sessionId: sessionRef.current.sessionId,
        participantCode: sessionRef.current.participantCode,
        studentName,
        ageBand,
        startedAt: sessionRef.current.startedAt,
        finishedAt: new Date().toISOString(),
        items,
        syntheticOnly: true as const,
      };
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok: boolean; summary?: ExamSummary };
        if (!res.ok || !data.ok || !data.summary) throw new Error('SAVE_REJECTED');
        setSummary(data.summary);
        if (resultsStorageKey) {
          try {
            window.localStorage.setItem(
              resultsStorageKey,
              JSON.stringify({
                sessionId: payload.sessionId,
                finishedAt: payload.finishedAt,
                summary: data.summary,
              }),
            );
          } catch {
            // localStorage best-effort only
          }
        }
        setPhase('done');
      } catch {
        // Fallback: the shell can still summarize locally so a demo never dead-ends.
        setSummary(summarize(items));
        setError('We could not save your session to the server; showing a local summary.');
        setPhase('error');
      }
    },
    [studentName, ageBand, endpoint, resultsStorageKey],
  );
  useEffect(() => {
    finalizeRef.current = (items) => void finalize(items);
  }, [finalize]);

  const handleOutcome = useCallback(
    (outcome: PlayerOutcome) => {
      if (lockRef.current) return;
      lockRef.current = true;
      const item = currentBankItemRef.current;
      if (!item) return;

      const nextResults = [...resultsRef.current, buildItemResult(item, outcome)];
      const nextPresented = [...presentedRef.current, item.itemId];
      resultsRef.current = nextResults;
      presentedRef.current = nextPresented;
      setAnsweredCount(nextResults.length);
      setResults(nextResults);

      const next = nextBankItem(sequencer, bank, nextPresented, nextResults);
      if (next) {
        present(next);
      } else {
        currentBankItemRef.current = null;
        setCurrentItem(null);
        finalizeRef.current(nextResults);
      }
    },
    [bank, sequencer, present],
  );

  const start = useCallback(() => {
    sessionRef.current = {
      sessionId: randomCode('SESS'),
      participantCode: randomCode('PART'),
      startedAt: new Date().toISOString(),
    };
    resultsRef.current = [];
    presentedRef.current = [];
    setAnsweredCount(0);
    setResults([]);
    setSummary(null);
    setError(null);

    const first = nextBankItem(sequencer, bank, [], []);
    setPhase('running');
    if (first) present(first);
    else finalizeRef.current([]);
  }, [bank, sequencer, present]);

  const retry = useCallback(() => {
    finalizeRef.current(resultsRef.current);
  }, []);

  return {
    phase,
    currentItem,
    answeredCount,
    totalPlanned: bank.length,
    results,
    summary,
    error,
    start,
    handleOutcome,
    retry,
  };
}
