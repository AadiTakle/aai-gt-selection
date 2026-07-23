'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import type { StatusProjection } from '@gt-selection/contracts';

import { fromSyntheticName } from '@/lib/family/synthetic';
import { readStoredApplication } from '@/lib/family/storage';
import { getApplicationAction, getApplicationStatusAction } from '@/lib/onboarding/actions';

import { FamilyDashboard } from './family-dashboard';
import styles from './dashboard-loader.module.css';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ready'; studentName: string; status: StatusProjection };

function newUuid(): string {
  return crypto.randomUUID();
}

export function DashboardLoader() {
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = readStoredApplication();
      if (!stored) {
        if (active) setLoad({ kind: 'empty' });
        return;
      }
      try {
        const [statusResult, appResult] = await Promise.all([
          getApplicationStatusAction({
            applicationId: stored.applicationId,
            correlationId: newUuid(),
          }),
          getApplicationAction({ applicationId: stored.applicationId, correlationId: newUuid() }),
        ]);
        if (!active) return;
        setLoad({
          kind: 'ready',
          studentName: fromSyntheticName(appResult.data.profile.student.fullName) || 'your student',
          status: statusResult.data,
        });
      } catch {
        if (active) setLoad({ kind: 'empty' });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (load.kind === 'loading') {
    return <p className={styles.state}>Loading your dashboard…</p>;
  }
  if (load.kind === 'empty') {
    return (
      <div className={styles.state}>
        <p>You don’t have an application yet.</p>
        <Link className={styles.link} href="/family/apply">
          Start your application →
        </Link>
      </div>
    );
  }
  return <FamilyDashboard studentName={load.studentName} status={load.status} />;
}
