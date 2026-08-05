'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import styles from './about-the-test.module.css';

/**
 * The explainer, as a deck of full-height screens rather than a page you scroll.
 *
 * The previous version put everything in front of the reader at once: a hero, a
 * carousel, a strip of test-wide facts, and a call to action, all stacked. Even
 * with the carousel per battery, the page still asked someone to decide where to
 * look. This version shows exactly one screen at a time and moves only when the
 * reader says so, so the order of ideas is the order they arrive in.
 *
 * FIVE SCREENS: what the test is, then one per battery, then where to start.
 * The battery order is the one the owner asked for (Verbal, Nonverbal,
 * Quantitative). Note that CogAT's own published order is Verbal, Quantitative,
 * Nonverbal; reordering the BATTERIES array is the whole change if that is ever
 * wanted.
 *
 * WHY THE FACTS MOVED. Scoring and where the cut sits used to sit in a strip
 * below the carousel. They are properties of the test rather than of any one
 * battery, so they belong on the screen that answers "what is this", which keeps
 * the battery screens down to one question and three lines each.
 *
 * THE SAMPLES ARE LIVE, NOT PICTURES. Each battery screen embeds the renderer the
 * baseline serves, from `public/exam-demos`, so a parent can answer one. Only the
 * visible screen is mounted, since each demo runs its own scripts and animations.
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
  readonly key: 'Verbal' | 'Nonverbal' | 'Quantitative';
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
];

/** Screen labels for the rail, in deck order: intro, batteries, close. */
const STEPS = ['What it is', ...BATTERIES.map((b) => b.key), 'Where to start'] as const;
const LAST = STEPS.length - 1;

export function AboutTheTest({ baselineHref }: { baselineHref: string }) {
  const [step, setStep] = useState(0);
  const [sample, setSample] = useState(0);

  /**
   * Clamped rather than wrapping. A deck with a beginning and an end reads as
   * progress; one that loops silently back to the start reads as a loop, and the
   * point of this rewrite is that the reader always knows where they are.
   *
   * Both movers reset the sample chips, so a battery never opens on its second
   * question. Every route between screens goes through one of these two, which is
   * what makes that guarantee hold without an effect watching `step`.
   */
  const goTo = useCallback((next: number) => {
    setStep(Math.max(0, Math.min(LAST, next)));
    setSample(0);
  }, []);

  const move = useCallback((delta: number) => {
    setStep((i) => Math.max(0, Math.min(LAST, i + delta)));
    setSample(0);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  const battery = step >= 1 && step <= BATTERIES.length ? BATTERIES[step - 1]! : null;
  const active = battery ? (battery.samples[sample] ?? battery.samples[0]!) : null;

  return (
    <div className={styles.deck}>
      <nav className={styles.rail} aria-label="Sections of this explainer">
        <ol className={styles.steps} role="tablist">
          {STEPS.map((label, i) => (
            <li key={label} className={styles.stepItem}>
              <button
                type="button"
                role="tab"
                aria-selected={i === step}
                aria-controls="about-panel"
                className={i === step ? `${styles.step} ${styles.stepOn}` : styles.step}
                onClick={() => goTo(i)}
              >
                <span className={styles.stepNum}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.stepLabel}>{label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <main
        className={styles.stage}
        id="about-panel"
        role="tabpanel"
        aria-label={STEPS[step]}
        /* Keyed so the entrance animation replays on every move. */
        key={step}
      >
        {step === 0 ? (
          <section className={`${styles.panel} ${styles.intro}`}>
            <p className={styles.kicker}>The test behind the decision</p>
            <h1 className={styles.title}>What is the CogAT?</h1>
            <p className={styles.lede}>
              It is a reasoning test, not a knowledge test. It does not ask what your child has been
              taught. It asks how well they work out something they have never seen before.
            </p>
            <dl className={styles.facts}>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>It comes in three parts</dt>
                <dd className={styles.factBody}>
                  Verbal, Nonverbal, and Quantitative, scored separately. They are not
                  interchangeable, and most children are stronger in one than the others.
                </dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>How it is scored</dt>
                <dd className={styles.factBody}>
                  Answers become a percentile against children the same age. The 95th percentile
                  means 95 of 100 same age children scored at or below your child.
                </dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>How the cut works</dt>
                <dd className={styles.factBody}>
                  Programs usually set a bar from the 90th up. Near that bar a score is genuinely
                  uncertain, and one weak battery is rarely decisive on its own.
                </dd>
              </div>
            </dl>
            <p className={styles.handoff}>
              Next: the three parts, one at a time, with a question of ours you can try.
            </p>
          </section>
        ) : null}

        {battery && active ? (
          <section className={styles.panel}>
            <header className={styles.panelHead}>
              <span className={styles.battery} data-battery={battery.key}>
                {battery.key}
              </span>
              <h2 className={styles.panelTitle}>{battery.blurb}</h2>
            </header>

            <div className={styles.split}>
              <div className={styles.demoCol}>
                {battery.samples.length > 1 ? (
                  <div className={styles.chips} role="group" aria-label="Try another question type">
                    {battery.samples.map((s, i) => (
                      <button
                        key={s.code}
                        type="button"
                        aria-pressed={i === sample}
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
          </section>
        ) : null}

        {step === LAST ? (
          <section className={`${styles.panel} ${styles.close}`}>
            <p className={styles.kicker}>Where to start</p>
            <h2 className={styles.title}>See where your child places</h2>
            <p className={styles.lede}>
              Under 40 minutes, free, and it reports these same three areas so you know which one to
              work on first. You can take it again later to see what actually moved.
            </p>
            <Link className={styles.primary} href={baselineHref}>
              Start the baseline
            </Link>
          </section>
        ) : null}
      </main>

      <footer className={styles.foot}>
        <p className={styles.boundary}>
          CogAT is a trademark of Riverside Insights. We are not affiliated with them or endorsed by
          them, and the levels our baseline reports do not predict a CogAT score.
        </p>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.nav}
            onClick={() => move(-1)}
            disabled={step === 0}
          >
            Back
          </button>
          <span className={styles.counter}>
            {step + 1} <span className={styles.counterDim}>/ {STEPS.length}</span>
          </span>
          <button
            type="button"
            className={styles.nav}
            onClick={() => move(1)}
            disabled={step === LAST}
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
}
