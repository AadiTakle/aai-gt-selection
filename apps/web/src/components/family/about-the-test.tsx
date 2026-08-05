'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import styles from './about-the-test.module.css';

/**
 * The explainer, as a full-screen walkthrough that takes over the browser.
 *
 * IT CONSUMES THE WHOLE SITE, deliberately. The stage is fixed to the viewport
 * and painted above the app shell, so the header, the 72rem content column and
 * the page scroll all disappear while it is open. Anything less than that and it
 * reads as a page inside a product rather than a thing you sit down and do. Body
 * scroll is locked for the same reason and restored on unmount.
 *
 * MOVEMENT IS A STATE MACHINE, not a CSS afterthought. Each move plays an exit,
 * swaps the screen at the halfway point, then plays an entrance whose children
 * are staggered. Holding two screens on the DOM to cross-fade them would mean two
 * live demo iframes animating at once, so the swap happens in the gap instead.
 * `dir` carries which way the slide should go so Back feels like going back.
 *
 * THE GATE IS THE POINT. Next does not exist on a battery screen until the demo
 * reports the question was answered, and it pops in when it arrives. Reading that
 * a figural matrix asks you to find a hidden rule teaches almost nothing; being
 * unable to move on until you have found one teaches the thing itself. Every demo
 * posts {source:'gt-exam-demo', type:'result'} on submit whether or not a host is
 * driving it, so one listener covers all three screens.
 *
 * THE SAFETY UNLOCK. If a demo fails to load the gate opens by itself after
 * UNLOCK_AFTER_MS. Without it a broken iframe is a dead end, and this page has no
 * login behind it to fall back on.
 *
 * No real CogAT items appear here. These are our own questions of the same kind.
 */

/** Exit half of a move. Must match --exit in the stylesheet. */
const EXIT_MS = 240;
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
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [answered, setAnswered] = useState<Readonly<Record<string, boolean>>>({});
  const pending = useRef<number | null>(null);

  const battery = step >= 1 && step <= BATTERIES.length ? BATTERIES[step - 1]! : null;
  const isOpen = battery ? answered[battery.code] === true : true;

  const go = useCallback(
    (next: number) => {
      const target = Math.max(0, Math.min(LAST, next));
      // Ignore a second press mid-move; two overlapping swaps would skip a screen.
      if (target === step || phase === 'out') return;
      setDir(target > step ? 'fwd' : 'back');
      pending.current = target;
      setPhase('out');
    },
    [step, phase],
  );

  // Swap at the halfway point of the move, then play the entrance.
  useEffect(() => {
    if (phase !== 'out') return;
    const timer = window.setTimeout(() => {
      if (pending.current !== null) setStep(pending.current);
      pending.current = null;
      setPhase('in');
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  // Take the page over completely: no site scroll behind the stage.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /**
   * The gate. Marked by item code rather than by step, so walking back to a
   * battery you already answered does not shut it again.
   */
  useEffect(() => {
    if (!battery) return;
    const code = battery.code;
    const open = () => setAnswered((prev) => (prev[code] ? prev : { ...prev, [code]: true }));

    function onMessage(event: MessageEvent) {
      const data = event.data as { source?: string; type?: string } | null;
      if (data?.source === 'gt-exam-demo' && data.type === 'result') open();
    }

    const unlock = window.setTimeout(open, UNLOCK_AFTER_MS);
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(unlock);
    };
  }, [battery]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') go(step - 1);
      if (event.key === 'ArrowRight' && isOpen) go(step + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, step, isOpen]);

  const screenClass = [
    styles.screen,
    phase === 'out' ? styles.leaving : styles.entering,
    dir === 'back' ? styles.back : styles.fwd,
  ].join(' ');

  return (
    <div className={styles.stage}>
      {/* The navy opening, faded rather than swapped so the handoff to paper is
          one movement. Sits under the content and takes no clicks. */}
      <div
        className={step === 0 ? styles.field : `${styles.field} ${styles.fieldOut}`}
        aria-hidden="true"
      />

      {step === 0 ? (
        <section className={`${screenClass} ${styles.intro}`} key="intro">
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
              <button type="button" className={styles.next} onClick={() => go(1)}>
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
        <section className={screenClass} key={battery.key}>
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
              <button type="button" className={styles.backBtn} onClick={() => go(step - 1)}>
                Back
              </button>
              {isOpen ? (
                <button
                  type="button"
                  className={`${styles.next} ${styles.pop}`}
                  onClick={() => go(step + 1)}
                >
                  {step === BATTERIES.length ? 'Finish' : 'Next'}
                </button>
              ) : (
                <p className={styles.gate}>
                  <span className={styles.pulse} aria-hidden="true" />
                  Answer the question to continue
                </p>
              )}
            </div>
          </footer>
        </section>
      ) : null}

      {step === LAST ? (
        <section className={`${screenClass} ${styles.done}`} key="done">
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
              <button type="button" className={styles.backBtn} onClick={() => go(0)}>
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
