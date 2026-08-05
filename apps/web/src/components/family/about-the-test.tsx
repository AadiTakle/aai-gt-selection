'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import styles from './about-the-test.module.css';

/**
 * The explainer, as a full-screen walkthrough a parent completes once.
 *
 * It opens on a navy field carrying nothing but the question and a short answer
 * to it. Pressing Next fades that field back to the site's paper and hands over
 * to three battery screens, each of which is a large live question in the middle
 * with what the battery measures along the bottom. The last screen lets you go.
 *
 * THE GATE IS THE POINT. Next does not exist on a battery screen until the demo
 * reports that the question was answered. Reading that a figural matrix asks you
 * to find a hidden rule teaches almost nothing; being unable to move on until you
 * have found one teaches the thing itself. `answerBattery` listens for the demo
 * protocol's `result` message, which every embedded demo posts on submit.
 *
 * THE SAFETY UNLOCK. If a demo fails to load or a child stalls, the gate opens by
 * itself after UNLOCK_AFTER_MS. Without it a broken iframe would be a dead end
 * with no way forward, and this page has no login behind it to fall back on.
 *
 * ONE QUESTION PER BATTERY, mounted only while its screen is showing. Each demo
 * runs its own scripts, animations and standalone bootstrap, so keeping three
 * alive at once would have them all animating off screen.
 *
 * WHY THESE SAMPLES. Every one self starts when no host drives it: embedded with
 * no `init` message, the demo boots its own bank sample after a second. Demos
 * without that fallback would sit blank in a frame here.
 *
 * No real CogAT items appear here. These are our own questions of the same kind.
 */

/** Opens the gate anyway, so a failed demo cannot trap someone on a screen. */
const UNLOCK_AFTER_MS = 45_000;

interface Battery {
  readonly key: 'Verbal' | 'Quantitative' | 'Nonverbal';
  readonly code: string;
  readonly cogat: string;
  readonly blurb: string;
  readonly ask: string;
  readonly measures: string;
  readonly onTest: string;
  readonly forGt: string;
}

const BATTERIES: readonly Battery[] = [
  {
    key: 'Verbal',
    code: 'VER-RELPAIR-01',
    cogat: 'Verbal Analogies',
    blurb: 'Reasoning with words, not vocabulary recall.',
    ask: 'Two words go together in a particular way. Find the pair that goes together the same way.',
    measures:
      'Whether a child can see how two ideas relate, then find that same relationship somewhere else.',
    onTest: 'Verbal analogies, sentence completion, and sorting words by what they share.',
    forGt: 'Moves with vocabulary depth, which grows slowly. Expect the least short-run change.',
  },
  {
    key: 'Quantitative',
    code: 'QUANT-MIX-01',
    cogat: 'Number Puzzles',
    blurb: 'Reasoning about quantity, not arithmetic speed.',
    ask: 'Change two amounts so the mix keeps the same balance. Quantities, without the arithmetic drill.',
    measures:
      'Whether a child can spot the rule behind a set of numbers or amounts and carry it to a new case.',
    onTest: 'Number series, number analogies, and puzzles about what keeps two sides balanced.',
    forGt: 'What makes these hard is well understood, so practice can be built precisely.',
  },
  {
    key: 'Nonverbal',
    code: 'SPA-PUNCH-01',
    cogat: 'Paper Folding',
    blurb: 'Reasoning with shapes and figures, no words involved.',
    ask: 'Fold the paper, punch a hole, then work out where every hole lands once it opens back up.',
    measures:
      'Whether a child can picture how a shape changes when it is folded or turned, and find hidden rules in a pattern.',
    onTest: 'Paper folding, figure matrices, and grouping figures by rule.',
    forGt: 'Responds to practice fastest. Widely assumed to be culture free, which it is not.',
  },
];

const LAST = BATTERIES.length + 1;

export function AboutTheTest({ baselineHref }: { baselineHref: string }) {
  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState<Readonly<Record<string, boolean>>>({});
  const topRef = useRef<HTMLDivElement | null>(null);

  const battery = step >= 1 && step <= BATTERIES.length ? BATTERIES[step - 1]! : null;
  const isOpen = battery ? answered[battery.code] === true : true;

  const move = useCallback((delta: number) => {
    setStep((i) => Math.max(0, Math.min(LAST, i + delta)));
  }, []);

  /**
   * The gate. Every demo posts `result` on submit whether or not a host is
   * driving it, so one listener covers all three screens. Marked by item code
   * rather than by step so going back to a battery you already answered does not
   * shut the gate again.
   */
  useEffect(() => {
    if (!battery) return;
    const code = battery.code;

    function onMessage(event: MessageEvent) {
      const data = event.data as { source?: string; type?: string } | null;
      if (data?.source === 'gt-exam-demo' && data.type === 'result') {
        setAnswered((prev) => (prev[code] ? prev : { ...prev, [code]: true }));
      }
    }

    const unlock = window.setTimeout(() => {
      setAnswered((prev) => (prev[code] ? prev : { ...prev, [code]: true }));
    }, UNLOCK_AFTER_MS);

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(unlock);
    };
  }, [battery]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight' && isOpen) move(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, isOpen]);

  // Screens are viewport sized, so a part-scrolled short window would otherwise
  // start the next screen halfway down.
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
  }, [step]);

  return (
    <div className={styles.stage} ref={topRef}>
      {/* The navy field, faded out rather than swapped, so the handoff to paper
          reads as one movement. Sits under the content and takes no clicks. */}
      <div
        className={step === 0 ? styles.field : `${styles.field} ${styles.fieldOut}`}
        aria-hidden="true"
      />

      {step === 0 ? (
        <section className={`${styles.screen} ${styles.intro}`}>
          <div className={styles.introTop}>
            <p className={styles.kicker}>The test behind the decision</p>
            <h1 className={styles.hero}>What is the CogAT?</h1>
          </div>

          <div className={styles.introBottom}>
            <p className={styles.introLede}>
              It is a reasoning test, not a knowledge test. It does not ask what your child has been
              taught. It asks how well they work out something they have never seen before. It comes
              in three parts, and they are not interchangeable.
            </p>
            <div className={styles.introActions}>
              <button type="button" className={styles.next} onClick={() => move(1)}>
                Next
              </button>
              <p className={styles.introHint}>Three parts, one question each. Around 4 minutes.</p>
            </div>
            <p className={styles.markIntro}>
              CogAT is a trademark of Riverside Insights. We are not affiliated with them or
              endorsed by them.
            </p>
          </div>
        </section>
      ) : null}

      {battery ? (
        <section className={styles.screen}>
          <header className={styles.bar}>
            <div className={styles.barLeft}>
              <span className={styles.tag} data-battery={battery.key}>
                {battery.key}
              </span>
              <p className={styles.blurb}>{battery.blurb}</p>
            </div>
            <ol className={styles.pips} aria-label={`Part ${step} of ${BATTERIES.length}`}>
              {BATTERIES.map((b, i) => (
                <li
                  key={b.key}
                  className={i === step - 1 ? `${styles.pip} ${styles.pipOn}` : styles.pip}
                  aria-current={i === step - 1 ? 'step' : undefined}
                >
                  <span className={styles.srOnly}>{b.key}</span>
                </li>
              ))}
            </ol>
          </header>

          <div className={styles.window}>
            <p className={styles.ask}>{battery.ask}</p>
            <div className={styles.frameWrap}>
              <iframe
                key={battery.code}
                className={styles.frame}
                src={`/exam-demos/${battery.code}.html`}
                title={`A ${battery.key.toLowerCase()} example question you can try`}
              />
            </div>
            <p className={styles.caption}>Our question, same kind as: {battery.cogat}</p>
          </div>

          <footer className={styles.dock}>
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

            <div className={styles.dockActions}>
              <button type="button" className={styles.back} onClick={() => move(-1)}>
                Back
              </button>
              {isOpen ? (
                <button type="button" className={styles.next} onClick={() => move(1)}>
                  {step === BATTERIES.length ? 'Finish' : 'Next'}
                </button>
              ) : (
                <p className={styles.gate}>Answer the question to continue</p>
              )}
            </div>
          </footer>
        </section>
      ) : null}

      {step === LAST ? (
        <section className={`${styles.screen} ${styles.done}`}>
          <div className={styles.doneInner}>
            <p className={styles.kickerInk}>That is the whole test</p>
            <h2 className={styles.hero}>You have seen all three parts</h2>
            <p className={styles.doneLede}>
              Verbal, Quantitative, and Nonverbal, scored separately. Programs usually set a bar
              from the 90th percentile up, and near that bar a score is genuinely uncertain, so one
              weak part is rarely decisive on its own.
            </p>
            <div className={styles.doneActions}>
              <Link className={styles.next} href={baselineHref}>
                See where your child places
              </Link>
              <button type="button" className={styles.back} onClick={() => setStep(0)}>
                Start over
              </button>
            </div>
            <p className={styles.mark}>
              CogAT is a trademark of Riverside Insights. We are not affiliated with them or
              endorsed by them, and the levels our baseline reports do not predict a CogAT score.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
