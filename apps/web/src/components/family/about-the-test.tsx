'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import styles from './about-the-test.module.css';

/**
 * The explainer, organized one battery at a time.
 *
 * The page used to be a carousel of four unrelated questions with a block of
 * reference text underneath, which meant a parent had to hold the question they
 * just saw in their head while reading about the test in general. It is now three
 * slides, one per battery, and each slide answers the same four things in the
 * same order: what this part asks, what it measures, where it shows up on the
 * real test, and what it means for a GT application. Three short lines each, on
 * purpose. Anything longer belongs on a different page.
 *
 * THE SAMPLES ARE LIVE, NOT PICTURES. Each slide embeds the renderer the baseline
 * serves, from `public/exam-demos`, so a parent can answer one. Only the visible
 * slide is mounted, since each demo runs its own scripts and animations.
 *
 * WHY THESE SAMPLES. Every one self starts when no host drives it. Other demos
 * wait for the exam runner to send them an item and would sit blank in a frame
 * here, so the set is constrained by that as much as by which types are most
 * typical. Verified before selection; recheck if this list changes.
 *
 * No real CogAT items appear here. These are our own questions of the same kind.
 */

interface Sample {
  readonly code: string;
  readonly label: string;
  readonly cogat: string;
  readonly ask: string;
}

interface Battery {
  readonly key: 'Verbal' | 'Quantitative' | 'Nonverbal';
  readonly blurb: string;
  readonly measures: string;
  readonly onTest: string;
  readonly forGt: string;
  readonly samples: readonly Sample[];
}

const BATTERIES: readonly Battery[] = [
  {
    key: 'Verbal',
    blurb: 'Reasoning with words, not vocabulary recall.',
    measures:
      'Whether a child can see how two ideas relate and then find that same relationship somewhere else.',
    onTest: 'Verbal analogies, sentence completion, and sorting words by what they have in common.',
    forGt:
      'Scores here move with how deeply a child knows words, which grows slowly. Expect this area to shift the least in a short run of practice.',
    samples: [
      {
        code: 'VER-RELPAIR-01',
        label: 'Relation Match',
        cogat: 'Verbal Analogies',
        ask: 'Two words go together in a particular way. Find the pair that goes together the same way.',
      },
    ],
  },
  {
    key: 'Quantitative',
    blurb: 'Reasoning about quantity, not arithmetic speed.',
    measures:
      'Whether a child can spot the rule behind a set of numbers or amounts and carry it to a new case.',
    onTest: 'Number series, number analogies, and puzzles about what keeps two sides balanced.',
    forGt:
      'What makes these items hard is well understood and fairly predictable, so this is the area where a practice ladder can be built most precisely.',
    samples: [
      {
        code: 'QUANT-MIX-01',
        label: 'Fair Share',
        cogat: 'Number Puzzles',
        ask: 'Change two amounts so the mix keeps the same balance. Quantities, without the arithmetic drill.',
      },
    ],
  },
  {
    key: 'Nonverbal',
    blurb: 'Reasoning with shapes and figures, no words involved.',
    measures:
      'Whether a child can find a hidden rule in a pattern, or picture how a shape changes when it is folded or turned.',
    onTest: 'Figure matrices, figure classification, and paper folding.',
    forGt:
      'This area responds to practice faster than the other two. It is also widely assumed to be free of language and culture, which the evidence does not support, so treat a low score here carefully rather than as a clean reading.',
    samples: [
      {
        code: 'SPA-PUNCH-01',
        label: 'Fold & Punch',
        cogat: 'Paper Folding',
        ask: 'Fold the paper, punch a hole, then work out where every hole lands once it opens back up.',
      },
      {
        code: 'FLU-MATRIX-01',
        label: 'Machine Matrix',
        cogat: 'Figure Matrices',
        ask: 'The shapes in the grid change by a hidden rule. Find the tile that finishes the pattern.',
      },
    ],
  },
];

export function AboutTheTest({ baselineHref }: { baselineHref: string }) {
  const [slide, setSlide] = useState(0);
  const [sample, setSample] = useState(0);
  const count = BATTERIES.length;

  const go = useCallback(
    (delta: number) => {
      setSlide((i) => (i + delta + count) % count);
      setSample(0);
    },
    [count],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const battery = BATTERIES[slide]!;
  const active = battery.samples[sample] ?? battery.samples[0]!;

  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <p className={styles.kicker}>The test behind the decision</p>
        <h1 className={styles.title}>What is the CogAT?</h1>
        <p className={styles.lede}>
          It is a reasoning test, not a knowledge test. It does not ask what your child has been
          taught. It asks how well they work out something they have never seen before. It comes in
          three parts, and they are not interchangeable.
        </p>
      </section>

      <section
        className={styles.sampler}
        aria-roledescription="carousel"
        aria-label="The three batteries"
      >
        <div className={styles.samplerBar}>
          <div className={styles.samplerMeta}>
            <span className={styles.battery} data-battery={battery.key}>
              {battery.key}
            </span>
            <p className={styles.blurb}>{battery.blurb}</p>
          </div>
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => go(-1)}
              aria-label="Previous battery"
            >
              <span aria-hidden="true">&lsaquo;</span>
            </button>
            <span className={styles.counter}>
              {slide + 1} <span className={styles.counterDim}>/ {count}</span>
            </span>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => go(1)}
              aria-label="Next battery"
            >
              <span aria-hidden="true">&rsaquo;</span>
            </button>
          </div>
        </div>

        <div className={styles.slide}>
          <div className={styles.demoCol}>
            {battery.samples.length > 1 ? (
              <div className={styles.chips} role="tablist" aria-label="Try another question type">
                {battery.samples.map((s, i) => (
                  <button
                    key={s.code}
                    type="button"
                    role="tab"
                    aria-selected={i === sample}
                    className={i === sample ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                    onClick={() => setSample(i)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className={styles.sampleName}>{active.label}</p>
            )}

            <p className={styles.ask}>{active.ask}</p>

            <div className={styles.screen}>
              <iframe
                key={active.code}
                className={styles.frame}
                src={`/exam-demos/${active.code}.html`}
                title={`${active.label}, an example question you can try`}
                loading="lazy"
              />
            </div>
            <p className={styles.sampleCogat}>Our question, same kind as: {active.cogat}</p>
          </div>

          <dl className={styles.notes}>
            <div className={styles.note}>
              <dt className={styles.noteLabel}>Measures</dt>
              <dd className={styles.noteBody}>{battery.measures}</dd>
            </div>
            <div className={styles.note}>
              <dt className={styles.noteLabel}>On the real test</dt>
              <dd className={styles.noteBody}>{battery.onTest}</dd>
            </div>
            <div className={styles.note}>
              <dt className={styles.noteLabel}>For a GT application</dt>
              <dd className={styles.noteBody}>{battery.forGt}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.dots} role="tablist" aria-label="Choose a battery">
          {BATTERIES.map((b, i) => (
            <button
              key={b.key}
              type="button"
              role="tab"
              aria-selected={i === slide}
              aria-label={b.key}
              className={i === slide ? `${styles.dot} ${styles.dotOn}` : styles.dot}
              onClick={() => {
                setSlide(i);
                setSample(0);
              }}
            />
          ))}
        </div>
      </section>

      <div className={styles.strip}>
        <div className={styles.stripItem}>
          <p className={styles.stripLabel}>How it is scored</p>
          <p className={styles.stripBody}>
            Answers become a percentile against children the same age. The 95th percentile means 95
            of 100 same age children scored at or below your child.
          </p>
        </div>
        <div className={styles.stripItem}>
          <p className={styles.stripLabel}>How the cut works</p>
          <p className={styles.stripBody}>
            Programs usually set a bar from the 90th up. Near that bar a score is genuinely
            uncertain, and one weak battery is rarely decisive on its own.
          </p>
        </div>
      </div>

      <section className={styles.cta}>
        <div>
          <p className={styles.ctaTitle}>See where your child places</p>
          <p className={styles.ctaBody}>
            Under 40 minutes, free, and it reports these same three areas so you know which one to
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
