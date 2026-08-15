import type { AgeBand, ScreenerConfig, SurfaceConfig } from '@gt/contracts';

/**
 * Surfaces are separate instruments, per the public-screener proposal: a game-delivered
 * version and a plain web version do not score the same way, because game familiarity
 * predicts performance on game-delivered tasks without predicting ability. So the
 * recommendation threshold lives on the surface rather than on the screener.
 *
 * The thresholds are deliberately well below a half. Under unequal error costs the
 * cost-optimal threshold is the false-positive share of total error cost, and here a false
 * positive is a family who fills in an application that gets declined while a false negative
 * is a child nobody ever hears about. Those are not close, so the arithmetic pushes the bar
 * low. An earlier draft used 0.55 and that quietly contradicted the proposal it came from.
 *
 * None of these numbers is calibrated. The game surface sits lowest only because it is
 * expected to carry the most construct-irrelevant variance.
 */
export const prototypeSurfaces: readonly SurfaceConfig[] = [
  { id: 'web-plain', label: 'Plain web page', recommendProbability: 0.35 },
  { id: 'ghost-site', label: 'Unbranded lead-generation site', recommendProbability: 0.35 },
  { id: 'gt-portal', label: 'GT admissions portal', recommendProbability: 0.4 },
  { id: 'game', label: 'Game or simulation surface', recommendProbability: 0.3 },
];

/**
 * The prototype screener.
 *
 * The ability threshold is set at 1.0 logits, roughly the top sixth of a standard normal
 * population, which is deliberately looser than any admissions bar. The proposal argues that
 * a screener whose only outcome is "consider applying" should recommend generously, since a
 * false positive costs one declined application and a false negative costs a child nobody
 * ever hears about.
 *
 * Reading load is capped at 'low' so the verbal analogy and classification families sit out.
 * That keeps the prototype usable by a candidate whose decoding lags their reasoning, which
 * is the confound raised twice in the 2026-08-03 call.
 */
export function defaultScreenerConfig(snapshotId: string, ageBand: AgeBand = '3-5'): ScreenerConfig {
  return {
    id: 'prototype-screener',
    version: '0.1.0',
    label: 'Prototype public screener',
    snapshotId,
    ageBand,
    // Minimums sum to seven, which is the earliest a session can possibly end. Setting them
    // higher removes the point of an adaptive stop, since the stop rule cannot fire until
    // every domain has met its minimum: a blueprint summing to the item floor means every
    // candidate answers the same number of questions.
    blueprint: [
      { domain: 'quantitative', minItems: 2, maxItems: 6 },
      { domain: 'verbal', minItems: 1, maxItems: 4 },
      { domain: 'spatial', minItems: 2, maxItems: 5 },
      { domain: 'fluid', minItems: 2, maxItems: 6 },
    ],
    stopRule: {
      abilityThreshold: 1.0,
      // Eager to pass a candidate through, reluctant to rule one out. The gap between these
      // two numbers is the asymmetric-loss argument expressed as a stopping rule.
      confidenceAbove: 0.75,
      confidenceBelow: 0.97,
      minItems: 8,
      maxItems: 16,
    },
    surfaces: prototypeSurfaces,
    // Every generator in the seed bank is uncalibrated, so requiring calibration would
    // leave nothing to serve. Flipping this to true is the first thing that should happen
    // once real responses exist.
    requireCalibratedItems: false,
    maxReadingLoad: 'low',
  };
}
