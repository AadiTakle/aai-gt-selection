/**
 * Type code arithmetic.
 *
 * A code is `AREA-FAMILY-VV`: `FLU-MATRIX-01`, `WM-corsi-01`, `CX-achieve-02`. The family is
 * everything before the final hyphen and the version is the final segment.
 *
 * Codes are stored verbatim and never normalised, because they are primary keys and they are also
 * filenames on disk, where casing is inconsistent. Family comparison is case-insensitive so that
 * `WM-corsi` and `WM-CORSI` cannot become two lineages of the same construct.
 */

export interface ParsedTypeCode {
  /** The code exactly as given. */
  readonly code: string;
  /** Everything before the final hyphen. */
  readonly family: string;
  readonly version: number;
}

const CODE_PATTERN = /^(.+)-(\d{1,3})$/;

export function tryParseTypeCode(code: string): ParsedTypeCode | null {
  const match = CODE_PATTERN.exec(code);
  if (!match) return null;
  const [, family, version] = match;
  if (!family || !version) return null;
  return { code, family, version: Number.parseInt(version, 10) };
}

export function parseTypeCode(code: string): ParsedTypeCode {
  const parsed = tryParseTypeCode(code);
  if (!parsed) {
    throw new Error(
      `malformed type code ${JSON.stringify(code)}: expected AREA-FAMILY-VV, e.g. FLU-MATRIX-01`,
    );
  }
  return parsed;
}

/** Two digits is the convention across all 53 existing codes. Wider versions are left unpadded. */
export function formatTypeCode(family: string, version: number): string {
  return `${family}-${String(version).padStart(2, '0')}`;
}

/** The only way a type ever changes: a new code at the next version in the same family. */
export function nextVersion(code: string): string {
  const { family, version } = parseTypeCode(code);
  return formatTypeCode(family, version + 1);
}

export function sameFamily(a: string, b: string): boolean {
  const left = tryParseTypeCode(a);
  const right = tryParseTypeCode(b);
  if (!left || !right) return false;
  return left.family.toLowerCase() === right.family.toLowerCase();
}
