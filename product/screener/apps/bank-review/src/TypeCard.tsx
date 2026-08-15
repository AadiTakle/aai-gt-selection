import { GRADE_BANDS, type ReviewSet, type TypeReview, type TypeSummary } from './types';

/**
 * One question type, with the three things being reviewed side by side: its grade range, whether its
 * CogAT mapping holds, and whether its difficulty is usable.
 *
 * The histogram is the reason this is a UI rather than a spreadsheet. A mean difficulty of 10.5 looks
 * fine and can be produced by a bank with nothing between 8 and 13, which is precisely the range an
 * adaptive engine spends most of its time in. Empty rungs are called out for that reason.
 */
export function TypeCard({
  summary,
  review,
  subtests,
  onChange,
}: {
  summary: TypeSummary;
  review: TypeReview;
  subtests: readonly string[];
  onChange: (next: TypeReview) => void;
}) {
  const set = (patch: Partial<TypeReview>) =>
    onChange({ ...review, ...patch, reviewedAt: new Date().toISOString() });

  const peak = Math.max(1, ...summary.difficulty.histogram);
  const spread = summary.difficulty.max - summary.difficulty.min;
  const thin = summary.items < 100;
  const narrow = spread < 6;

  return (
    <article className={`card ${review.verdict ?? ''}`}>
      <header className="cardhead">
        <div>
          <h3>
            <code>{summary.typeCode}</code>
            {review.reviewedAt ? <span className="seen">reviewed</span> : null}
          </h3>
          <p className="meta">
            <span className={`dom ${summary.domain}`}>{summary.domain.replace('_', ' ')}</span>
            <span className={thin ? 'warn' : ''}>{summary.items} items</span>
            <span>grades {summary.bandSpan}</span>
            {summary.cogat ? (
              <span className={`tag ${summary.cogat.strength}`}>
                {summary.cogat.subtest} · {summary.cogat.strength}
              </span>
            ) : (
              <span className="tag none">no CogAT analogue</span>
            )}
            <span className={`cost ${summary.contextCost}`}>{summary.contextCost}</span>
          </p>
        </div>
        <div className="verdicts">
          {(['keep', 'rework', 'cut'] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={`verdict ${v} ${review.verdict === v ? 'on' : ''}`}
              onClick={() => set({ verdict: review.verdict === v ? undefined : v })}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      <div className="grid">
        <section>
          <h4>Difficulty across the 1 to 20 design scale</h4>
          <div className="hist">
            {summary.difficulty.histogram.map((count, i) => (
              <div
                key={i}
                className={`bar ${count === 0 ? 'empty' : ''}`}
                style={{ height: `${Math.max(2, (count / peak) * 100)}%` }}
                title={`rungs ${i * 2 + 1}-${i * 2 + 2}: ${count} items`}
              />
            ))}
          </div>
          <p className="axis">
            <span>1</span>
            <span>10</span>
            <span>20</span>
          </p>
          <p className="stat">
            range {summary.difficulty.min.toFixed(1)} to {summary.difficulty.max.toFixed(1)}
            {narrow ? <span className="warn"> · only {spread.toFixed(1)} wide</span> : null} · median{' '}
            {summary.difficulty.median.toFixed(1)}
          </p>
          {summary.difficulty.emptyRungs.length > 0 ? (
            <p className="stat warn">
              {summary.difficulty.emptyRungs.length} of 10 buckets are empty. An adaptive engine
              targeting one of them has nothing to serve.
            </p>
          ) : null}

          <div className="row">
            {(['well-tuned', 'too-easy', 'too-hard', 'too-narrow', 'uneven'] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`chip ${review.difficultyVerdict === d ? 'on' : ''}`}
                onClick={() =>
                  set({ difficultyVerdict: review.difficultyVerdict === d ? undefined : d })
                }
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4>Grade range</h4>
          <p className="stat">
            The bank claims: {summary.ageBands.map((b) => `${b.band} (${b.items})`).join(', ') || 'none'}
          </p>
          <div className="row">
            <label className="field narrow">
              <span>override lowest</span>
              <select
                value={review.gradeFrom ?? ''}
                onChange={(e) => set({ gradeFrom: e.target.value || undefined })}
              >
                <option value="">as-is</option>
                {GRADE_BANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label className="field narrow">
              <span>override highest</span>
              <select
                value={review.gradeTo ?? ''}
                onChange={(e) => set({ gradeTo: e.target.value || undefined })}
              >
                <option value="">as-is</option>
                {GRADE_BANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {summary.readingBand ? (
            <p className="stat">
              Carries reading at band {summary.readingBand}, so it cannot sit below it whatever the
              reasoning demands.
            </p>
          ) : (
            <p className="stat ok">No reading load, so grade range is a reasoning judgement only.</p>
          )}

          <h4>Does the CogAT mapping hold?</h4>
          <div className="row">
            {(['yes', 'no', 'different'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`chip ${review.cogatFits === f ? 'on' : ''}`}
                onClick={() => set({ cogatFits: review.cogatFits === f ? undefined : f })}
              >
                {f}
              </button>
            ))}
          </div>
          {review.cogatFits === 'different' ? (
            <label className="field">
              <span>it is really</span>
              <select
                value={review.cogatShouldBe ?? ''}
                onChange={(e) => set({ cogatShouldBe: e.target.value || undefined })}
              >
                <option value="">pick a subtest</option>
                {subtests.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="none">none of them</option>
              </select>
            </label>
          ) : null}
        </section>
      </div>

      <details>
        <summary>What the items actually look like</summary>
        <ul className="samples">
          {summary.samples.map((sample) => (
            <li key={sample.itemId}>
              <span className="mono small">
                {sample.difficulty.toFixed(1)} · {sample.ageBands.join('/')}
              </span>
              <p>{sample.preview}</p>
              <p className="mono small dim">{sample.contentKeys.join(', ')}</p>
            </li>
          ))}
        </ul>
        <p className="mono small dim">UI needed: {summary.uiElements.join(', ')}</p>
      </details>

      <label className="field">
        <span>Note</span>
        <input
          value={review.note ?? ''}
          placeholder="what you would change, and why"
          onChange={(e) => set({ note: e.target.value })}
        />
      </label>
    </article>
  );
}

/** How far through the library a reviewer has got. */
export function progressOf(summaries: readonly TypeSummary[], review: ReviewSet) {
  const done = summaries.filter((s) => review[s.typeCode]?.verdict).length;
  return { done, total: summaries.length };
}
