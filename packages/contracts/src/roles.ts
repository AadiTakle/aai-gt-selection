import { z } from 'zod';

export const userRoleSchema = z.enum([
  'family',
  'admissions_operator',
  'reviewer',
  'review_supervisor',
  'decision_service',
  'auditor',
  'privacy_steward',
]);

export type UserRole = z.infer<typeof userRoleSchema>;
