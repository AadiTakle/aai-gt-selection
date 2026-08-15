import { describe, expect, it } from 'vitest';

import { parseUserRoleClaim } from './role-claims';

describe('admin-controlled role claims', () => {
  it('reads the business role from app_metadata', () => {
    const result = parseUserRoleClaim({
      app_metadata: {
        synthetic_only: true,
        user_role: 'reviewer',
      },
      role: 'authenticated',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('reviewer');
    }
  });

  it('ignores a role supplied through user_metadata', () => {
    const result = parseUserRoleClaim({
      app_metadata: {},
      user_metadata: {
        user_role: 'admissions_operator',
      },
    });

    expect(result.success).toBe(false);
  });
});
