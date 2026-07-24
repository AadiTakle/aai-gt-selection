'use client';

import Link from 'next/link';

import styles from './family-landing.module.css';

const SPIRAL_PATHS = [
  'M7.24 17.81c.53 1.18 1.13 2.34 1.78 3.46-.19.92-.31 1.8-.36 2.62-.2 3.27.73 4.74 1.52 5.2.7.4 2.13.5 4.33-.71.69.67 1.39 1.27 2.09 1.82-2.89 1.82-5.68 2.35-7.73 1.17-3.2-1.85-3.68-7.34-1.63-13.56Z',
  'M10.13.14C11.96-.29 14.22.3 16.61 1.8c-.7.54-1.4 1.15-2.09 1.82-1.75-.96-3.04-1.1-3.81-.91-.69.17-1.5.75-1.88 2.58-.4 1.9-.19 4.66.85 7.9 1.03 3.2 2.75 6.48 4.88 9.29 2.15 2.83 4.5 4.9 6.6 6.01 2.15 1.13 3.47.98 4.1.64.61-.33 1.41-1.29 1.57-3.62.13-1.9-.22-4.3-1.1-6.93h-9.24c-.53-.86-.99-1.74-1.43-2.63h12.49l.07.15c1.37 3.46 2.01 6.83 1.83 9.59-.19 2.78-1.21 4.79-2.9 5.73l-.04.02c-1.71.92-3.99.71-6.51-.59l-.06-.03c-2.5-1.31-5.08-3.63-7.36-6.6l-.11-.14c-2.31-3.04-4.17-6.58-5.29-10.07C6.05 10.5 5.73 7.25 6.25 4.74 6.78 2.24 8.12.63 10.08.15l.05-.01Z',
  'M12.82 7.47C17.45 1.59 23.12-1.39 26.62.63c2.05 1.18 2.99 3.87 2.85 7.28-.82-.34-1.7-.64-2.62-.9-.05-2.51-.85-3.7-1.55-4.1-.79-.46-2.53-.53-5.27 1.28-1.13.75-2.3 1.74-3.46 2.96.39-.01.78-.02 1.17-.02 9.8 0 17.75 3.97 17.75 8.87 0 2.37-1.86 4.52-4.88 6.11-.12-.88-.3-1.79-.53-2.72 2.15-1.3 2.78-2.59 2.78-3.39 0-.92-.81-2.46-3.74-3.92-2.78-1.39-6.8-2.32-11.38-2.32-1.27 0-2.49.07-3.66.2h-.01c-1.14.14-2.23.34-3.24.58.68-1.1 1.4-2.13 2.16-3.09Z',
  'M4.88 9.89c.12.88.3 1.79.53 2.72-2.15 1.3-2.78 2.59-2.78 3.39 0 .81.63 2.1 2.78 3.39-.23.93-.41 1.84-.53 2.72C1.86 20.52 0 18.37 0 16c0-2.37 1.86-4.52 4.88-6.11Z',
];

const JOURNEY = [
  {
    n: '01',
    label: 'Application',
    detail: 'Tell us about your student and family. A few focused minutes.',
  },
  {
    n: '02',
    label: 'CogAT assessment',
    detail: 'The required next step, unlocked once your application is in.',
  },
  {
    n: '03',
    label: 'Eligibility result',
    detail: 'Routed automatically. Eligibility only, never an admission decision.',
  },
];

/**
 * Front door for the family portal. Leads with the navy + blueprint hero (so it
 * feels like one product with the dashboard), the GT spiral as centerpiece, one
 * clear CTA to begin, and a preview of the three-phase journey so families know
 * the path before they start. `basePath` drives both the real gated routes and
 * the dev preview routes.
 */
export function FamilyLanding({
  hasApplication,
  basePath = '/family',
}: {
  hasApplication: boolean;
  basePath?: string;
}) {
  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>Family application portal · Fall 2027</p>
          <h1 className={styles.title}>
            School reimagined, for gifted kids who love to learn.
          </h1>
          <p className={styles.intro}>
            Begin your family’s application. It takes only a few focused minutes, everything saves
            as you go, and you can pick up right where you left off.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href={`${basePath}/apply`}>
              {hasApplication ? 'Continue your application' : 'Start your application'} →
            </Link>
            {hasApplication ? (
              <Link className={styles.secondary} href={`${basePath}/dashboard`}>
                View your dashboard
              </Link>
            ) : null}
          </div>
        </div>

        <div className={styles.heroMark} aria-hidden="true">
          <div className={styles.spiral}>
            <svg viewBox="0 0 36 32">
              {SPIRAL_PATHS.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </svg>
          </div>
        </div>
      </section>

      <section className={styles.journey} aria-label="What to expect">
        {JOURNEY.map((step) => (
          <div key={step.n} className={styles.jStep}>
            <span className={styles.jNum}>{step.n}</span>
            <p className={styles.jLabel}>{step.label}</p>
            <p className={styles.jDetail}>{step.detail}</p>
          </div>
        ))}
      </section>

      <p className={styles.boundary}>
        This is an eligibility application only, not an enrollment or admission decision.
      </p>
    </div>
  );
}
