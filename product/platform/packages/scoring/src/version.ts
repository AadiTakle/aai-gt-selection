/**
 * The algorithm identity stamped onto every score sheet.
 *
 * A sheet is a function of three things: the response trace, the item parameters in force, and this
 * algorithm. Two of those are already recorded per response. Without the third, a sheet recomputed
 * six months from now could differ from the one a family was shown and nobody could say why.
 *
 * Bump this whenever the posterior, the stop rule, or the sheet's derivation changes. Never reuse a
 * version for a changed algorithm.
 */
export const ENGINE_VERSION = 'engine-2026.08.10';
