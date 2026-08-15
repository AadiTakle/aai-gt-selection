import { useCallback, useEffect, useMemo, useState } from 'react';

import { progressOf, TypeCard } from './TypeCard';
import type { ReviewSet, TypeReview, TypeSummary } from './types';

/**
 * Bank review: go through the question types and settle three questions per type.
 *
 * Does its grade range make sense, does its CogAT mapping hold, and is its difficulty usable. The
 * filters exist because the useful order to work in is not alphabetical: the types with no CogAT
 * analogue are the ones the new focus makes optional, and the types with holes in their difficulty
 * distribution are the ones that will fail an adaptive engine regardless of what else is true.
 *
 * Verdicts persist to `docs/design/bank-review.json` so the review becomes data the rest of the
 * project can read, rather than a conversation.
 */

type Filter =
  | 'all'
  | 'cogat-direct'
  | 'cogat-loose'
  | 'cogat-none'
  | 'thin-bank'
  | 'has-gaps'
  | 'unreviewed';

const FILTERS: { id: Filter; label: string; hint: string }[] = [
  { id: 'all', label: 'Everything', hint: 'All 53 types' },
  { id: 'cogat-direct', label: 'CogAT direct', hint: 'Same item family as a CogAT subtest' },
  { id: 'cogat-loose', label: 'CogAT loose', hint: 'Related but a different format. The judgement calls' },
  { id: 'cogat-none', label: 'No CogAT analogue', hint: 'What the new focus makes optional' },
  { id: 'thin-bank', label: 'Thin banks', hint: 'Under 100 items, so a cohort will see repeats' },
  { id: 'has-gaps', label: 'Gaps in difficulty', hint: 'Empty buckets an engine can aim at and find nothing' },
  { id: 'unreviewed', label: 'Not yet reviewed', hint: 'No verdict recorded' },
];

export default function App() {
  const [summaries, setSummaries] = useState<TypeSummary[]>([]);
  const [subtests, setSubtests] = useState<string[]>([]);
  const [review, setReview] = useState<ReviewSet>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [summaryRes, reviewRes] = await Promise.all([
          fetch('/api/summary'),
          fetch('/api/review'),
        ]);
        const summaryBody = (await summaryRes.json()) as {
          types?: TypeSummary[];
          subtests?: string[];
          error?: string;
        };
        if (summaryBody.error) {
          setError(summaryBody.error);
        } else {
          setSummaries(summaryBody.types ?? []);
          setSubtests(summaryBody.subtests ?? []);
        }
        const reviewBody = (await reviewRes.json()) as { review?: ReviewSet };
        setReview(reviewBody.review ?? {});
      } catch {
        setError('Could not load the banks. Is the dev server running?');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async () => {
    setSaved(null);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ review }),
      });
      const body = (await res.json()) as { savedTo?: string; error?: string };
      if (body.error) setError(body.error);
      else setSaved(body.savedTo ?? 'saved');
    } catch {
      setError('Could not save the review.');
    }
  }, [review]);

  // Autosave, because a reviewer working through 53 types should not lose an hour to a refresh.
  useEffect(() => {
    if (Object.keys(review).length === 0) return;
    const timer = setTimeout(() => void save(), 1500);
    return () => clearTimeout(timer);
  }, [review, save]);

  const shown = useMemo(() => {
    return summaries.filter((s) => {
      switch (filter) {
        case 'cogat-direct':
          return s.cogat?.strength === 'direct';
        case 'cogat-loose':
          return s.cogat?.strength === 'loose';
        case 'cogat-none':
          return s.cogat === null;
        case 'thin-bank':
          return s.items < 100;
        case 'has-gaps':
          return s.difficulty.emptyRungs.length > 0;
        case 'unreviewed':
          return !review[s.typeCode]?.verdict;
        default:
          return true;
      }
    });
  }, [summaries, filter, review]);

  const progress = progressOf(summaries, review);
  const counts = useMemo(() => {
    const tally = { keep: 0, rework: 0, cut: 0 };
    for (const entry of Object.values(review)) {
      if (entry.verdict) tally[entry.verdict] += 1;
    }
    return tally;
  }, [review]);

  const totalItems = summaries.reduce((sum, s) => sum + s.items, 0);
  const keptItems = summaries
    .filter((s) => review[s.typeCode]?.verdict === 'keep')
    .reduce((sum, s) => sum + s.items, 0);

  return (
    <div className="app">
      <header className="head">
        <p className="kicker">Bank review</p>
        <h1>Grade ranges, CogAT fit, and whether the difficulties are usable</h1>
        <p className="lede">
          {summaries.length} question types, {totalItems.toLocaleString()} items. Three judgements per
          type. Saves as you go to <code>docs/design/bank-review.json</code>, so the result is data the
          rest of the project can read.
        </p>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="note">Reading 53 banks…</p> : null}

      <div className="bar">
        <div className="progress">
          <strong>
            {progress.done} of {progress.total}
          </strong>
          <span>reviewed</span>
          <div className="track">
            <div
              className="fill"
              style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
            />
          </div>
        </div>
        <div className="tally">
          <span className="keep">{counts.keep} keep</span>
          <span className="rework">{counts.rework} rework</span>
          <span className="cut">{counts.cut} cut</span>
          {counts.keep > 0 ? (
            <span className="dim">
              {keptItems.toLocaleString()} items kept
            </span>
          ) : null}
        </div>
        {saved ? <span className="savedflag">saved</span> : null}
      </div>

      <nav className="filters">
        {FILTERS.map((f) => {
          const n = summaries.filter((s) => {
            switch (f.id) {
              case 'cogat-direct':
                return s.cogat?.strength === 'direct';
              case 'cogat-loose':
                return s.cogat?.strength === 'loose';
              case 'cogat-none':
                return s.cogat === null;
              case 'thin-bank':
                return s.items < 100;
              case 'has-gaps':
                return s.difficulty.emptyRungs.length > 0;
              case 'unreviewed':
                return !review[s.typeCode]?.verdict;
              default:
                return true;
            }
          }).length;
          return (
            <button
              key={f.id}
              type="button"
              className={`filter ${filter === f.id ? 'on' : ''}`}
              onClick={() => setFilter(f.id)}
              title={f.hint}
            >
              {f.label} <span className="n">{n}</span>
            </button>
          );
        })}
      </nav>

      {shown.map((summary) => (
        <TypeCard
          key={summary.typeCode}
          summary={summary}
          review={review[summary.typeCode] ?? {}}
          subtests={subtests}
          onChange={(next: TypeReview) => setReview({ ...review, [summary.typeCode]: next })}
        />
      ))}

      {!loading && shown.length === 0 ? (
        <p className="note">Nothing matches that filter.</p>
      ) : null}
    </div>
  );
}
