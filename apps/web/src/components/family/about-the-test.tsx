'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import styles from './about-the-test.module.css';

/**
 * The explainer, rebuilt around a live sampler instead of prose.
 *
 * The first version asked a parent to read four screens of writing before seeing
 * a single question. A reasoning question explains itself in about five seconds
 * of looking at it, so the page now leads with a short blurb, hands most of the
 * space to a carousel of real playable questions, and keeps the reference
 * material to three short cards at the bottom.
 *
 * THE SAMPLES ARE LIVE, NOT PICTURES. Each slide embeds the same renderer the
 * baseline serves, from `public/exam-demos`, so a parent can actually answer one.
 * Only the visible slide is mounted, because each demo runs its own scripts and
 * animations and four at once is wasteful.
 *
 * WHY THESE FOUR. They cover all three batteries, and each one self starts when
 * no host drives it. Several other demos wait for an item to be sent by the exam
 * runner and would sit blank in a frame here, which is why the set is not simply
 * the four most typical types. Verified before selection, and worth rechecking if
 * this list ever changes.
 *
 * No real CogAT items appear here. These are our own questions of the same kind,
 * which is both the legal position and the honest one.
 */

interface Sample {
  readonly code: string;
  readonly battery: 'Verbal' | 'Quantitative' | 'Nonverbal';
  readonly name: string;
  readonly cogat: string;
  readonly ask: string;
}

const SAMPLES: readonly Sample[] = [
  {
    code: 'SPA-PUNCH-01',
    battery: 'Nonverbal',
    name: 'Fold & Punch',
    cogat: 'Paper Folding',
    ask: 'Fold the paper, punch a hole, then work out where every hole lands once it opens back up.',
  },
  {
    code: 'FLU-MATRIX-01',
    battery: 'Nonverbal',
    name: 'Machine Matrix',
    cogat: 'Figure Matrices',
    ask: 'The shapes in the grid change by a hidden rule. Find the tile that finishes the pattern.',
  },
  {
    code: 'VER-RELPAIR-01',
    battery: 'Verbal',
    name: 'Relation Match',
    cogat: 'Verbal Analogies',
    ask: 'Two words go together in a particular way. Find the pair that goes together the same way.',
  },
  {
    code: 'QUANT-MIX-01',
    battery: 'Quantitative',
    name: 'Fair Share',
    cogat: 'Number Puzzles',
    ask: 'Change two amounts so the mix keeps the same balance. Quantities, without the arithmetic drill.',
  },
];

const FACTS = [
  {
    label: 'Scoring',
    lead: 'A percentile, not a grade',
    body: 'Answers become a scaled score, then a percentile against children the same age. The 95th percentile means 95 of 100 same age children scored at or below your child.',
  },
  {
    label: 'Sorting',
    lead: 'The cut is usually a percentile',
    body: 'Programs commonly set a bar somewhere from the 90th up. Near that bar a score is genuinely uncertain, because a couple of answers can move a percentile several points.',
  },
  {
    label: 'For a GT application',
    lead: 'Rarely one number alone',
    body: 'A realistic rubric offers several routes in, often mixing a reasoning score with achievement screeners. One weak area is not usually fatal, and one strong area is not usually enough.',
  },
] as const;

export function AboutTheTest({ baselineHref }: { baselineHref: string }) {
  const [index, setIndex] = useState(0);
  const count = SAMPLES.length;

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const active = SAMPLES[index]!;

  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <p className={styles.kicker}>The test behind the decision</p>
        <h1 className={styles.title}>What is the CogAT?</h1>
        <p className={styles.lede}>
          It is a reasoning test, not a knowledge test. It does not ask what your child has been
          taught. It asks how well they work out something they have never seen before. That is why
          the questions look strange at first, and why seeing a few of them beats reading about
          them.
        </p>
      </section>

      <section
        className={styles.sampler}
        aria-roledescription="carousel"
        aria-label="Example questions"
      >
        <div className={styles.samplerBar}>
          <div className={styles.samplerMeta}>
            <span className={styles.battery} data-battery={active.battery}>
              {active.battery}
            </span>
            <div>
              <p className={styles.sampleName}>{active.name}</p>
              <p className={styles.sampleCogat}>Same kind as: {active.cogat}</p>
            </div>
          </div>
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => go(-1)}
              aria-label="Previous example"
            >
              <span aria-hidden="true">&lsaquo;</span>
            </button>
            <span className={styles.counter}>
              {index + 1} <span className={styles.counterDim}>/ {count}</span>
            </span>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => go(1)}
              aria-label="Next example"
            >
              <span aria-hidden="true">&rsaquo;</span>
            </button>
          </div>
        </div>

        <p className={styles.ask}>{active.ask}</p>

        <div className={styles.screen}>
          <iframe
            key={active.code}
            className={styles.frame}
            src={`/exam-demos/${active.code}.html`}
            title={`${active.name}, an example question you can try`}
            loading="lazy"
          />
        </div>

        <div className={styles.dots} role="tablist" aria-label="Choose an example">
          {SAMPLES.map((s, i) => (
            <button
              key={s.code}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={s.name}
              className={i === index ? `${styles.dot} ${styles.dotOn}` : styles.dot}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>

        <p className={styles.samplerNote}>
          These are our questions, not the real test&rsquo;s. Real items are copyrighted and kept
          secure, so practicing on a copy of one would not be practice at all. Try any of them. The
          arrow keys work too.
        </p>
      </section>

      <section className={styles.facts}>
        {FACTS.map((f, i) => (
          <div key={f.label} className={styles.fact}>
            <span className={styles.factNum}>{String(i + 1).padStart(2, '0')}</span>
            <p className={styles.factLabel}>{f.label}</p>
            <p className={styles.factLead}>{f.lead}</p>
            <p className={styles.factBody}>{f.body}</p>
          </div>
        ))}
      </section>

      <section className={styles.cta}>
        <div>
          <p className={styles.ctaTitle}>See where your child places</p>
          <p className={styles.ctaBody}>
            Under 40 minutes, free, and it reports the same three areas so you know which one to
            work on first.
          </p>
        </div>
        <Link className={styles.primary} href={baselineHref}>
          Start the baseline
        </Link>
      </section>

      <p className={styles.boundary}>
        CogAT is a trademark of Riverside Insights. We are not affiliated with them or endorsed by
        them, and the levels our baseline reports do not predict a CogAT score.
      </p>
    </div>
  );
}
