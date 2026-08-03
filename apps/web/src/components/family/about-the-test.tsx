import Link from 'next/link';

import styles from './about-the-test.module.css';

/**
 * The explainer: what the CogAT is, what it is looking for, what its scores mean,
 * and how schools actually use it. Requested by the design owner, 2026-08-03.
 *
 * TWO RULES THIS PAGE FOLLOWS, both load-bearing rather than legal boilerplate.
 *
 * 1. NO REAL COGAT ITEMS. The CogAT is a published, copyrighted instrument from
 *    Riverside Insights, and its live items are secured. Every sample below is one
 *    of OUR question types, described as *the same kind of question* — which is
 *    also the honest framing, because a practice item that were a real item would
 *    be a leak rather than practice.
 * 2. NO IMPLIED AFFILIATION AND NO PREDICTED SCORE. We are not endorsed by or
 *    connected to Riverside, and nothing here says a level in our baseline
 *    predicts a CogAT score. It could not: no study links the two scales.
 *
 * Every factual claim traces to the project's own research rather than to general
 * knowledge — the battery structure and untimed younger levels to the
 * CogAT gaps report, the SD-16 scale and tail behavior to the
 * gifted-assessment-quality BrainLift (Insight 11), and the admissions usage to
 * E-096 and E-099, which record what one school actually does.
 */

/** The three batteries, and what each is really asking of a child. */
const BATTERIES = [
  {
    name: 'Verbal',
    asking:
      'Can the child reason about how words and ideas relate, rather than recall definitions?',
    subtests: [
      {
        cogat: 'Verbal Analogies',
        plain: 'Two words go together somehow. Apply that same relationship to a third word.',
        ours: 'VER-RELPAIR-01',
      },
      {
        cogat: 'Sentence Completion',
        plain: 'Choose the word that makes a sentence make sense.',
        ours: 'VER-CLOZE-01',
      },
      {
        cogat: 'Verbal Classification',
        plain: 'Three things belong together. Find the fourth that belongs with them.',
        ours: 'VER-SORTBOT-01',
      },
    ],
  },
  {
    name: 'Quantitative',
    asking: 'Can the child see structure in quantities, rather than compute quickly?',
    subtests: [
      {
        cogat: 'Number Analogies',
        plain: 'A pair of numbers is related by some rule. Apply it to a new number.',
        ours: 'QUANT-FUNC-01',
      },
      {
        cogat: 'Number Puzzles',
        plain: 'Work out the missing value that makes both sides balance.',
        ours: 'QUANT-BALANCE-01',
      },
      {
        cogat: 'Number Series',
        plain: 'Find what comes next in a sequence that follows a hidden rule.',
        ours: 'QUANT-SERIES-01',
      },
    ],
  },
  {
    name: 'Nonverbal',
    asking:
      'Can the child reason about shapes and patterns with no words involved at all — which is why this battery reaches children whose English is still developing?',
    subtests: [
      {
        cogat: 'Figure Matrices',
        plain: 'A grid of shapes changes by a rule. Work out the missing cell.',
        ours: 'FLU-MATRIX-01',
      },
      {
        cogat: 'Paper Folding',
        plain: 'A folded, punched sheet is opened out. Picture where the holes land.',
        ours: 'SPA-FOLDNET-01',
      },
      {
        cogat: 'Figure Classification',
        plain: 'Three figures share a property. Find the fourth that shares it.',
        ours: 'FLU-CARPET-01',
      },
    ],
  },
] as const;

export function AboutTheTest({ baselineHref }: { baselineHref: string }) {
  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Background</p>
        <h1 className={styles.title}>What the CogAT is, and what it is looking for</h1>
        <p className={styles.lede}>
          Most gifted programs decide using a reasoning test, and in the US that test is very often
          the CogAT. It is worth understanding what it actually measures before you practice for it,
          because the thing it rewards is not the thing most people assume.
        </p>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>It measures reasoning, not knowledge</h2>
        <p className={styles.p}>
          The CogAT — the Cognitive Abilities Test — is a reasoning test, not an achievement test.
          It is not trying to find out what a child has been taught. It is trying to find out how
          well they work out something they have not seen before: spotting a rule, applying a
          relationship, holding a pattern in mind long enough to use it.
        </p>
        <p className={styles.p}>
          That is why children can be strong at school and unremarkable on the CogAT, or the
          reverse. It is also why the questions look strange the first time you meet them.
          Familiarity with the
          <em> format</em> is a real advantage, and it is the part that practice can legitimately
          fix.
        </p>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>Three batteries, nine kinds of question</h2>
        <p className={styles.p}>
          The test is built in three batteries, each scored separately as well as together. Below is
          what each battery is really asking, the nine question kinds it uses, and one of our
          practice types of the same kind so you can see the shape of it.
        </p>

        {BATTERIES.map((battery) => (
          <div key={battery.name} className={styles.battery}>
            <h3 className={styles.h3}>{battery.name}</h3>
            <p className={styles.asking}>{battery.asking}</p>
            <ul className={styles.subtests}>
              {battery.subtests.map((s) => (
                <li key={s.cogat} className={styles.subtest}>
                  <p className={styles.subtestName}>{s.cogat}</p>
                  <p className={styles.subtestPlain}>{s.plain}</p>
                  <p className={styles.subtestOurs}>
                    Our version: <code>{s.ours}</code>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <p className={styles.note}>
          These are descriptions of each question kind and our own practice items — not questions
          from the real test, which are copyrighted and kept secure. That is the point of practicing
          on ours: a real item in your hands would not be practice, it would be a leak.
        </p>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>What the scores mean</h2>
        <p className={styles.p}>
          Raw answers become a scaled score, and that becomes a percentile — the share of same-age
          children scoring at or below your child. A 95th percentile means 95 of 100 same-age
          children scored at or below them. Programs usually set their bar in percentiles, commonly
          somewhere from the 90th up.
        </p>
        <p className={styles.p}>
          Two things about those numbers are worth knowing, because they explain a lot of confusing
          results:
        </p>
        <ul className={styles.bullets}>
          <li>
            <strong>The scale is not the IQ scale you may be thinking of.</strong> The CogAT reports
            on a scale with a standard deviation of 16, while most IQ tests use 15. A score of 130
            is about the 98th percentile on an SD-15 scale but closer to the 97th here — so a cutoff
            written for one test does not carry over to another unchanged.
          </li>
          <li>
            <strong>Percentiles get coarse and jumpy at the top.</strong> Far from the average, a
            couple of extra right answers can move a percentile several points, and the norms up
            there rest on relatively few children. A score near a cutoff is genuinely uncertain, and
            a child who lands just under one day can land just over on another.
          </li>
        </ul>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>How schools actually use it</h2>
        <p className={styles.p}>
          Rarely as a single number, and rarely alone. A realistic admissions rubric offers several
          routes in: a high CogAT; or achievement screeners above their own percentile bar with a
          somewhat lower CogAT; or a blend of the two; or a very high composite as an
          exceptional-ability route. Separate requirements — a reading threshold, for instance —
          often sit alongside, with named exceptions for children whose English is still catching
          up.
        </p>
        <p className={styles.p}>
          The practical upshot: <strong>a single score rarely decides anything by itself</strong>,
          which cuts both ways. One weak battery is not usually fatal, and one strong battery is not
          usually sufficient.
        </p>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>What it is good at, and where it misses</h2>
        <p className={styles.p}>
          It earns its place: it predicts school achievement reasonably well, the nonverbal battery
          reaches children whose English is still developing, and at younger levels the test is
          untimed, so it is not primarily a speed contest.
        </p>
        <p className={styles.p}>Its known limits matter just as much:</p>
        <ul className={styles.bullets}>
          <li>
            <strong>It misses some children who belong.</strong> In practice, schools see few
            children who score high and then struggle, but a real number who score below the bar and
            would have thrived — most often the youngest, whose scores are least stable.
          </li>
          <li>
            <strong>Its coverage is narrower than &ldquo;ability&rdquo;.</strong> Verbal,
            quantitative and figural reasoning is a lot, but it is not everything. Strong spatial
            reasoners in particular can be under-served by what the test looks at.
          </li>
          <li>
            <strong>It is one sitting, on one day.</strong> Nothing in a single administration
            separates a child having a bad morning from a child who cannot do the task.
          </li>
        </ul>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.h2}>Where to start</h2>
        <p className={styles.p}>
          Take the baseline. It reports the same three areas, so you can see which one is furthest
          behind and practice that instead of practicing everything equally.
        </p>
        <Link className={styles.primary} href={baselineHref}>
          See where you place →
        </Link>
      </section>

      <p className={styles.boundary}>
        CogAT is a trademark of its publisher, Riverside Insights. We are not affiliated with,
        endorsed by, or connected to them, and this page is our own explanation rather than official
        guidance. Our practice questions are our own, resemble the real ones in kind only, and the
        levels our baseline reports do not predict a CogAT score.
      </p>
    </div>
  );
}
