'use client';

import type { ReactNode } from 'react';

import styles from './page-fade.module.css';

/**
 * Wraps each family route so navigations fade/slide in instead of hard-cutting.
 * Used from route `template.tsx` files, which re-mount on every navigation.
 */
export function PageFade({ children }: { children: ReactNode }) {
  return <div className={styles.fade}>{children}</div>;
}
