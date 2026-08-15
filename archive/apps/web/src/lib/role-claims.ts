import { userRoleSchema, type UserRole } from '@gt-selection/contracts';

export function parseUserRoleClaim(claims: Record<string, unknown> | undefined) {
  const appMetadata = claims?.app_metadata;
  if (!appMetadata || typeof appMetadata !== 'object' || Array.isArray(appMetadata)) {
    return userRoleSchema.safeParse(undefined);
  }

  return userRoleSchema.safeParse((appMetadata as Record<string, unknown>).user_role);
}

/** Where each role lands after signing in. */
const ROLE_HOME: Record<UserRole, string> = {
  family: '/family',
  admissions_operator: '/admissions',
  reviewer: '/review',
  review_supervisor: '/review',
  decision_service: '/admissions',
  auditor: '/config-audit',
  privacy_steward: '/config-audit',
};

/** The post-login destination for a role (defaults to the family portal). */
export function homeForRole(role: UserRole): string {
  return ROLE_HOME[role] ?? '/family';
}
