import { userRoleSchema } from '@gt-selection/contracts';

export function parseUserRoleClaim(claims: Record<string, unknown> | undefined) {
  const appMetadata = claims?.app_metadata;
  if (!appMetadata || typeof appMetadata !== 'object' || Array.isArray(appMetadata)) {
    return userRoleSchema.safeParse(undefined);
  }

  return userRoleSchema.safeParse((appMetadata as Record<string, unknown>).user_role);
}
