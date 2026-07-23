'use client';

import styles from './progress-gauge.module.css';

const SPIRAL_PATHS = [
  'M7.24 17.81c.53 1.18 1.13 2.34 1.78 3.46-.19.92-.31 1.8-.36 2.62-.2 3.27.73 4.74 1.52 5.2.7.4 2.13.5 4.33-.71.69.67 1.39 1.27 2.09 1.82-2.89 1.82-5.68 2.35-7.73 1.17-3.2-1.85-3.68-7.34-1.63-13.56Z',
  'M10.13.14C11.96-.29 14.22.3 16.61 1.8c-.7.54-1.4 1.15-2.09 1.82-1.75-.96-3.04-1.1-3.81-.91-.69.17-1.5.75-1.88 2.58-.4 1.9-.19 4.66.85 7.9 1.03 3.2 2.75 6.48 4.88 9.29 2.15 2.83 4.5 4.9 6.6 6.01 2.15 1.13 3.47.98 4.1.64.61-.33 1.41-1.29 1.57-3.62.13-1.9-.22-4.3-1.1-6.93h-9.24c-.53-.86-.99-1.74-1.43-2.63h12.49l.07.15c1.37 3.46 2.01 6.83 1.83 9.59-.19 2.78-1.21 4.79-2.9 5.73l-.04.02c-1.71.92-3.99.71-6.51-.59l-.06-.03c-2.5-1.31-5.08-3.63-7.36-6.6l-.11-.14c-2.31-3.04-4.17-6.58-5.29-10.07C6.05 10.5 5.73 7.25 6.25 4.74 6.78 2.24 8.12.63 10.08.15l.05-.01Z',
  'M12.82 7.47C17.45 1.59 23.12-1.39 26.62.63c2.05 1.18 2.99 3.87 2.85 7.28-.82-.34-1.7-.64-2.62-.9-.05-2.51-.85-3.7-1.55-4.1-.79-.46-2.53-.53-5.27 1.28-1.13.75-2.3 1.74-3.46 2.96.39-.01.78-.02 1.17-.02 9.8 0 17.75 3.97 17.75 8.87 0 2.37-1.86 4.52-4.88 6.11-.12-.88-.3-1.79-.53-2.72 2.15-1.3 2.78-2.59 2.78-3.39 0-.92-.81-2.46-3.74-3.92-2.78-1.39-6.8-2.32-11.38-2.32-1.27 0-2.49.07-3.66.2h-.01c-1.14.14-2.23.34-3.24.58.68-1.1 1.4-2.13 2.16-3.09Z',
  'M4.88 9.89c.12.88.3 1.79.53 2.72-2.15 1.3-2.78 2.59-2.78 3.39 0 .81.63 2.1 2.78 3.39-.23.93-.41 1.84-.53 2.72C1.86 20.52 0 18.37 0 16c0-2.37 1.86-4.52 4.88-6.11Z',
];

type ProgressGaugeProps = {
  /** Overall progress ratio (0..1). */
  overall: number;
  remainingLabel?: string;
};

const R = 44;
const CIRC = 2 * Math.PI * R;

export function ProgressGauge({ overall, remainingLabel }: ProgressGaugeProps) {
  const clamped = Math.max(0, Math.min(1, overall));
  const pct = Math.round(clamped * 100);
  const complete = clamped > 0.995;

  return (
    <div className={complete ? `${styles.gauge} ${styles.complete}` : styles.gauge}>
      <div className={styles.ring}>
        {/* one continuous ring that fills clockwise from the top */}
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className={styles.track} cx="50" cy="50" r={R} fill="none" strokeWidth={6} />
          <circle
            className={styles.fill}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - clamped)}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className={styles.spiral}>
          <svg viewBox="0 0 36 32">
            {SPIRAL_PATHS.map((d, index) => (
              <path key={index} d={d} />
            ))}
          </svg>
        </div>
      </div>
      <div className={styles.meta}>
        <div className={styles.pct}>{pct}%</div>
        <div className={styles.caption}>
          {complete ? 'Ready to sign.' : (remainingLabel ?? 'Your application')}
        </div>
      </div>
    </div>
  );
}
