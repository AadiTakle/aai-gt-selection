import Link from 'next/link';

import styles from './assessment-page.module.css';

/**
 * The baseline page: what the baseline measures, then start it.
 *
 * NO PAYMENT AND NO GATE (pivot decision, 2026-08-03 — see
 * `docs/product/COGAT_PREP_PIVOT.md` §7.1). This page used to advertise a $75
 * mock fee and hold the assessment behind a `confirmMockPayment()` that wrote an
 * unlock flag to `sessionStorage`. The product is a preparation tool now rather
 * than an admissions step, so the baseline is free and directly startable, and
 * the whole fee/unlock path is gone rather than disabled — a dormant paywall is
 * a thing someone re-enables by accident.
 *
 * The page is a server component again as a result: with nothing to unlock there
 * is no client state left to hold.
 */

/**
 * The three batteries the baseline reports, which are CogAT's own structure
 * rather than the four domains this page used to list. Nonverbal absorbs what
 * were separately "fluid" and "spatial" — that is how the target test groups
 * them, and reporting a shape the target test does not use would make the
 * baseline harder to act on, not more precise.
 */
const BATTERIES = [
  {
    name: 'Verbal',
    detail: 'Word relationships, sentence meaning, and sorting ideas by what they have in common.',
  },
  {
    name: 'Quantitative',
    detail: 'Number relationships, sequences, and puzzles about how quantities balance.',
  },
  {
    name: 'Nonverbal',
    detail: 'Figure patterns, folding and rotating shapes, and grouping figures by rule.',
  },
] as const;

export function AssessmentPage({
  dashboardHref,
  examHref,
  aboutHref,
}: {
  dashboardHref: string;
  examHref: string;
  /**
   * The explainer on what the CogAT is and how it gets used. Offered HERE, on the
   * baseline step, because this is the moment a parent is deciding whether the
   * thing is worth 40 minutes of their child's afternoon — and the answer depends
   * on understanding what the real test rewards. Optional so the component still
   * renders in contexts that have no route for it.
   */
  aboutHref?: string;
}) {
  return (
    <div className={styles.wrap}>
      <Link className={styles.back} href={dashboardHref}>
        ← Back to portal
      </Link>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.kicker}>Baseline</p>
          <h1 className={styles.title}>See where you place</h1>
          <p className={styles.lede}>
            A short reasoning session that finds your child’s level in each area, then points at the
            ones worth practicing. Free, and you can take it again later to see what moved.
          </p>
          {aboutHref ? (
            <p className={styles.aboutLine}>
              New to this?{' '}
              <Link className={styles.aboutLink} href={aboutHref}>
                Read what the CogAT is and how schools use it →
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.detailCard}>
          <p className={styles.cardKicker}>At a glance</p>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Length</dt>
              <dd className={styles.factValue}>Under 40 minutes, in one sitting</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Format</dt>
              <dd className={styles.factValue}>
                Adaptive. Questions get harder or easier with each answer, so the level always fits
              </dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Preparation</dt>
              <dd className={styles.factValue}>
                None needed. This one is the starting point you practice against
              </dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>You get back</dt>
              <dd className={styles.factValue}>
                A level in each of the three areas, the question types worth practicing first, and a
                way in to practice
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.feeCard}>
          <p className={styles.cardKicker}>Cost</p>
          <p className={styles.feeAmount}>Free</p>
          <p className={styles.feeNote}>
            No card, and you can take it again whenever you want to see what has moved.
          </p>

          <Link className={styles.primary} href={examHref}>
            Start the baseline →
          </Link>
        </section>
      </div>

      <section className={styles.measures}>
        <p className={styles.cardKicker}>What it measures</p>
        <p className={styles.sectionLede}>
          Three areas, scored separately, so practice can go where it is actually needed.
        </p>
        <div className={styles.domainGrid}>
          {BATTERIES.map((d, i) => (
            <div key={d.name} className={styles.domain}>
              <span className={styles.domainNum}>{String(i + 1).padStart(2, '0')}</span>
              <p className={styles.domainName}>{d.name}</p>
              <p className={styles.domainDetail}>{d.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/*
        The claim boundary, rewritten for a preparation product. The old wording bounded an
        admissions decision, which this no longer makes. What has to be bounded now is the
        comparison a family will naturally assume: that a level here is a CogAT score, or an IQ.
        Neither is supportable — there is no study linking this scale to CogAT's, and what practice
        changes is performance on reasoning questions rather than a person's intelligence.
      */}
      <p className={styles.boundary}>
        This is practice, not an official test. It is not an IQ test, it is not affiliated with or
        endorsed by the makers of the CogAT, and the levels here do not predict a score on it. What
        it gives you is a starting point and something to practice against.
      </p>
    </div>
  );
}
