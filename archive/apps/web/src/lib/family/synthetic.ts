/**
 * Helpers for the born-synthetic data constraints.
 *
 * The contracts require names/addresses to begin with the literal word
 * "Synthetic" and postal code to be exactly "00000". Rather than silently
 * rewriting what a parent types (which would be deceptive about what is
 * stored), the UI shows a visible "Synthetic" prefix and these helpers make
 * the stored value explicit and predictable.
 */

const SYNTHETIC_PREFIX = 'Synthetic';

/** Prefix a free-text fragment with the required, visible "Synthetic" token. */
export function toSyntheticName(fragment: string): string {
  const trimmed = fragment.trim();
  if (trimmed.length === 0) return '';
  if (/^Synthetic(?:\s|$)/.test(trimmed)) return trimmed;
  return `${SYNTHETIC_PREFIX} ${trimmed}`;
}

/** Strip the leading "Synthetic " token for display back in an input. */
export function fromSyntheticName(value: string | undefined | null): string {
  if (!value) return '';
  return value.replace(/^Synthetic\s*/, '');
}

export const SYNTHETIC_POSTAL_CODE = '00000';
export const SYNTHETIC_COUNTRY_CODE = 'US';

/** Build a synthetic student code from a short slug the user cannot see. */
export function toSyntheticStudentCode(seed: string): string {
  const slug = seed
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `STUDENT-SYN-${slug || 'APPLICANT'}`;
}
