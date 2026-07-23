'use client';

import Link from 'next/link';

import styles from './family-landing.module.css';

/**
 * Entry surface for the family portal. One clear primary action to begin the
 * application (low friction). `basePath` lets the same component drive both the
 * real gated routes and the dev preview routes.
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
      <div className={styles.hero}>
        <span className={styles.wordmark}>
          GT<span className={styles.school}> SCHOOL</span>
        </span>
        <p className={styles.eyebrow}>Family application portal · Fall 2027</p>
        <h1 className={styles.title}>School reimagined, for gifted kids who love to learn.</h1>
        <p className={styles.intro}>
          Start your family’s application. It only takes a few focused minutes, everything saves as
          you go, and you can pick up right where you left off.
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
    </div>
  );
}
