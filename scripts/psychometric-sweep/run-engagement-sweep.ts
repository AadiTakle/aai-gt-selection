import process from 'node:process';

import { probabilityCorrect } from '../../packages/cat-engine/src/irt';
import {
  createPersonaRun,
  PERSONA_ARCHETYPES,
  samplePersonaCohort,
  type Persona,
  type PersonaTrial,
} from '../../packages/cat-engine/src/persona-sim/index';
import {
  detectionPerformance,
  driftDeclineFlags,
  implausiblePatternFlags,
  interactionFlags,
  rapidGuessFlags,
  sampleInteractionScore,
  unionFlags,
  type DetectorTrial,
} from '../../packages/cat-engine/src/psychometric-lab/index';
import { hashSeed, mulberry32 } from '../../packages/cat-engine/src/rng';
import { estimateThetaEap } from '../../packages/cat-engine/src/theta';
import type { ScoredResponse } from '../../packages/cat-engine/src/types';

import { driveSession } from '../../apps/web/src/lib/exam/session';
import { FixedSequencer } from '../../apps/web/src/lib/exam/sequencer';

import { syntheticRecoveryBank } from '../persona-sim/bank';
import { bias, fmt, mean, pearson, rmse, round } from '../persona-sim/stats';
import {
  CLAIM_HEADER,
  defaultOutDir,
  flagValue,
  mdTable,
  numberFlag,
  writeArtifact,
} from './common';

/**
 * EXPERIMENT 3 — engagement-detector specification.
 *
 * QUESTION: the production RT rapid-guess gate leaves a −0.199 composite bias
 * against −0.066 under perfect engagement telemetry, because RT sees only FAST
 * disengagement. What must `M-ENGAGE` actually capture to close that gap, and how
 * much of it does each candidate signal recover?
 *
 * WHY THIS RUNS THE REAL SESSION SHELL: unlike Experiments 1 and 2, this one has
 * to be numerically comparable to the recorded baseline, so it drives the SAME
 * bank, the SAME `FixedSequencer`, the SAME `driveSession` loop and the SAME seed
 * as `scripts/persona-sim/run-recovery.ts`. The `RT gate only` row below must
 * reproduce the recorded 0.467 / −0.199, and the oracle row the recorded 0.396 /
 * −0.066; if they drift, the comparison is invalid and the run says so.
 *
 * The detectors run as a SECOND SCORING PASS: administer, estimate theta under the
 * RT gate, then flag implausible or disengaged trials against that estimate and
 * re-estimate. That is how server-side scoring already works, and it avoids
 * crediting a detector with information it could not have had at the time.
 *
 * CLAIM BOUNDARY: sensitivity and specificity are measured against a SIMULATED
 * on-task flag from an assumed engagement model, not observed behaviour. They say
 * what a signal COULD buy if disengagement behaved as the simulator assumes. No
 * result here justifies telling a family that their child was disengaged (R10).
 */

const bank = syntheticRecoveryBank();

/** Dwell-quality settings under test, as the separation multiplier in the generator. */
const DWELL_SEPARATIONS = [1, 0.75, 0.5, 0.25] as const;

/** Threshold on the interaction score; the midpoint of the two state means. */
const DWELL_THRESHOLD = 0.55;

interface PersonaSession {
  persona: Persona;
  standing: PersonaTrial[];
  /** Detector-visible view of the standing trials, in administration order. */
  detectorTrials: DetectorTrial[];
  /** Interaction evidence per dwell quality, parallel to `standing`. */
  interactionByQuality: Map<number, number[]>;
  onTask: boolean[];
  scoringMismatches: number;
}

function runPersona(persona: Persona, seed: string): PersonaSession {
  const run = createPersonaRun(persona, `${seed}|fixed`, {
    itemIrt: (item) => bank.irtByItemId.get(item.itemId),
  });
  const session = driveSession(bank.items, new FixedSequencer(), run.respond);

  let scoringMismatches = 0;
  session.results.forEach((result, i) => {
    const trial = run.trials[i];
    if (!trial) {
      scoringMismatches += 1;
      return;
    }
    if (result.accuracy !== (trial.correct ? 1 : 0)) scoringMismatches += 1;
  });

  const standing = run.trials.filter((t) => t.stage === 'standing');

  // The working ability estimate the detectors are allowed to see: the production
  // RT-gated composite. A detector that used the TRUE theta would be scoring
  // itself with the answer key.
  const gated = standing.filter((t) => t.rtMs > bank.rapidGuessThresholdMs);
  const working = estimateThetaEap(gated.map((t) => ({ irt: t.irt, correct: t.correct }))).theta;

  const interactionByQuality = new Map<number, number[]>();
  for (const separation of DWELL_SEPARATIONS) {
    interactionByQuality.set(
      separation,
      standing.map((trial) =>
        sampleInteractionScore(
          // A substream of its own, keyed off a trial that has already happened,
          // so adding this signal cannot perturb the recorded baseline's draws.
          mulberry32(hashSeed(`${seed}|dwell|${separation}|${persona.personaId}|${trial.order}`)),
          trial.onTask,
          { separation },
        ),
      ),
    );
  }

  return {
    persona,
    standing,
    detectorTrials: standing.map((trial) => ({
      rtMs: trial.rtMs,
      correct: trial.correct,
      expectedCorrect: probabilityCorrect(working, trial.irt),
    })),
    interactionByQuality,
    onTask: standing.map((trial) => trial.onTask),
    scoringMismatches,
  };
}

interface DetectorSpec {
  id: string;
  label: string;
  /** Signals the detector consumes, for the specification table. */
  signals: string;
  flags: (session: PersonaSession) => boolean[];
}

function withInteraction(session: PersonaSession, separation: number): DetectorTrial[] {
  const scores = session.interactionByQuality.get(separation)!;
  return session.detectorTrials.map((trial, i) => ({ ...trial, interactionScore: scores[i]! }));
}

function buildDetectors(): DetectorSpec[] {
  const rt = (s: PersonaSession) => rapidGuessFlags(s.detectorTrials, bank.rapidGuessThresholdMs);
  const drift = (s: PersonaSession) => driftDeclineFlags(s.detectorTrials);
  const pattern = (s: PersonaSession) => implausiblePatternFlags(s.detectorTrials);
  const dwell = (s: PersonaSession, separation: number) =>
    interactionFlags(withInteraction(s, separation), DWELL_THRESHOLD);

  const detectors: DetectorSpec[] = [
    { id: 'none', label: 'no gate', signals: '—', flags: (s) => s.detectorTrials.map(() => false) },
    { id: 'rt', label: 'RT rapid-guess floor (production)', signals: 'RT', flags: rt },
    {
      id: 'rt+drift',
      label: 'RT + within-session decline (latching)',
      signals: 'RT, residual trend',
      flags: (s) => unionFlags(rt(s), drift(s)),
    },
    {
      // Reported so the decline result is not an artefact of the latching choice:
      // a non-latching window flags only while the collapse is visible.
      id: 'rt+drift-window',
      label: 'RT + within-session decline (window only)',
      signals: 'RT, residual trend',
      flags: (s) => unionFlags(rt(s), driftDeclineFlags(s.detectorTrials, { latching: false })),
    },
    {
      id: 'rt+pattern',
      label: 'RT + implausible-miss runs',
      signals: 'RT, response pattern',
      flags: (s) => unionFlags(rt(s), pattern(s)),
    },
    {
      id: 'rt+drift+pattern',
      label: 'RT + decline + pattern',
      signals: 'RT, residual trend, response pattern',
      flags: (s) => unionFlags(rt(s), drift(s), pattern(s)),
    },
    {
      id: 'dwell',
      label: 'dwell/interaction only',
      signals: 'per-item interaction',
      flags: (s) => dwell(s, 1),
    },
    {
      id: 'rt+dwell',
      label: 'RT + dwell/interaction',
      signals: 'RT, per-item interaction',
      flags: (s) => unionFlags(rt(s), dwell(s, 1)),
    },
    {
      id: 'rt+drift+pattern+dwell',
      label: 'RT + decline + pattern + dwell',
      signals: 'all four',
      flags: (s) => unionFlags(rt(s), drift(s), pattern(s), dwell(s, 1)),
    },
  ];

  for (const separation of DWELL_SEPARATIONS.slice(1)) {
    detectors.push({
      id: `rt+dwell@${separation}`,
      label: `RT + dwell at ${Math.round(separation * 100)}% separation`,
      signals: 'RT, degraded per-item interaction',
      flags: (s) => unionFlags(rt(s), dwell(s, separation)),
    });
  }

  detectors.push({
    id: 'oracle',
    label: 'perfect engagement telemetry (upper bound)',
    signals: 'ground truth',
    flags: (s) => s.onTask.map((onTask) => !onTask),
  });

  return detectors;
}

interface DetectorSummary {
  id: string;
  label: string;
  signals: string;
  sensitivity: number;
  specificity: number;
  precision: number;
  /** Share of administered standing items the detector removes from theta. */
  excludedShare: number;
  rmse: number;
  bias: number;
  pearson: number;
  meanSe: number;
  /** Share of the RT-gate-to-oracle bias gap this detector closes. */
  gapClosed: number;
}

function main(): void {
  const argv = process.argv.slice(2);
  const n = numberFlag(argv, '--n', 1000);
  // The recorded baseline's seed, deliberately: the RT and oracle rows have to be
  // the SAME numbers `docs/PERSONA_SIM_RESULTS.md` reports, or nothing here is
  // comparable to it.
  const seed = flagValue(argv, '--seed') ?? 'persona-sim-2026-07-27';
  const outDir = flagValue(argv, '--out') ?? defaultOutDir();
  const startedAt = new Date().toISOString();

  const cohort = samplePersonaCohort({ seed, n });
  const sessions = cohort.map((persona) => runPersona(persona, seed));
  const scoringMismatches = sessions.reduce((s, x) => s + x.scoringMismatches, 0);
  const truth = sessions.map((s) => s.persona.thetaMean);

  const detectors = buildDetectors();
  const scored = detectors.map((detector) => {
    let tpSum = 0;
    let fnSum = 0;
    let fpSum = 0;
    let tnSum = 0;
    let excluded = 0;
    let total = 0;
    const estimates: number[] = [];
    const ses: number[] = [];

    for (const session of sessions) {
      const flags = detector.flags(session);
      const performance = detectionPerformance(flags, session.onTask);
      tpSum += performance.truePositive;
      fnSum += performance.offTask - performance.truePositive;
      fpSum += performance.falsePositive;
      tnSum += performance.n - performance.offTask - performance.falsePositive;
      excluded += flags.filter(Boolean).length;
      total += flags.length;

      const kept: ScoredResponse[] = [];
      session.standing.forEach((trial, i) => {
        if (!flags[i]) kept.push({ irt: trial.irt, correct: trial.correct });
      });
      const estimate = estimateThetaEap(kept);
      estimates.push(estimate.theta);
      ses.push(estimate.se);
    }

    return {
      detector,
      sensitivity: tpSum + fnSum === 0 ? Number.NaN : tpSum / (tpSum + fnSum),
      specificity: tnSum + fpSum === 0 ? Number.NaN : tnSum / (tnSum + fpSum),
      precision: tpSum + fpSum === 0 ? Number.NaN : tpSum / (tpSum + fpSum),
      excludedShare: total === 0 ? Number.NaN : excluded / total,
      rmse: rmse(truth, estimates),
      bias: bias(truth, estimates),
      pearson: pearson(truth, estimates),
      meanSe: mean(ses),
    };
  });

  const rtRow = scored.find((s) => s.detector.id === 'rt')!;
  const oracleRow = scored.find((s) => s.detector.id === 'oracle')!;
  const gap = rtRow.bias - oracleRow.bias;

  const summaries: DetectorSummary[] = scored.map((s) => ({
    id: s.detector.id,
    label: s.detector.label,
    signals: s.detector.signals,
    sensitivity: s.sensitivity,
    specificity: s.specificity,
    precision: s.precision,
    excludedShare: s.excludedShare,
    rmse: s.rmse,
    bias: s.bias,
    pearson: s.pearson,
    meanSe: s.meanSe,
    gapClosed: gap === 0 ? Number.NaN : (rtRow.bias - s.bias) / gap,
  }));

  // The baseline anchor. Reported, not asserted: a mismatch is a finding about the
  // comparison's validity and must be visible in the artifact rather than thrown.
  const anchorOk =
    Math.abs(rtRow.rmse - 0.467) < 0.0005 &&
    Math.abs(rtRow.bias + 0.199) < 0.0005 &&
    Math.abs(oracleRow.rmse - 0.396) < 0.0005 &&
    Math.abs(oracleRow.bias + 0.066) < 0.0005 &&
    scoringMismatches === 0;

  const lines: string[] = [];
  lines.push('# Experiment 3 — Engagement-detector specification (SYNTHETIC)', '');
  lines.push(CLAIM_HEADER, '');
  lines.push(
    `Run: N=${n} personas · seed \`${seed}\` · real \`driveSession\` + \`FixedSequencer\` over the ` +
      `${bank.items.length}-item recovery bank · RT floor ${bank.rapidGuessThresholdMs} ms · ${startedAt}`,
    '',
  );
  lines.push(
    `**Baseline anchor:** production-scoring vs generator mismatches ${scoringMismatches}; ` +
      `RT gate RMSE ${fmt(rtRow.rmse)} / bias ${fmt(rtRow.bias)} (recorded 0.467 / −0.199); ` +
      `perfect telemetry RMSE ${fmt(oracleRow.rmse)} / bias ${fmt(oracleRow.bias)} ` +
      `(recorded 0.396 / −0.066). Anchor reproduced: **${anchorOk ? 'yes' : 'NO — see below'}**.`,
    '',
  );

  lines.push('## Detector performance and what it buys', '');
  lines.push(
    mdTable(
      [
        'detector',
        'signals required',
        'sensitivity',
        'specificity',
        'precision',
        'items excluded',
        'composite RMSE',
        'bias',
        'Pearson r',
        'mean SE',
        'bias gap closed',
      ],
      summaries.map((s) => [
        s.label,
        s.signals,
        fmt(s.sensitivity),
        fmt(s.specificity),
        fmt(s.precision),
        fmt(s.excludedShare),
        fmt(s.rmse),
        fmt(s.bias),
        fmt(s.pearson),
        fmt(s.meanSe),
        fmt(s.gapClosed),
      ]),
    ),
    '',
  );
  lines.push(
    '`bias gap closed` is the share of the RT-gate-to-perfect-telemetry bias gap ' +
      `(${fmt(rtRow.bias)} to ${fmt(oracleRow.bias)}) that the detector removes. ` +
      '`items excluded` is the cost side: a detector that flags aggressively buys bias reduction ' +
      'with precision, and a form cannot spend items it has already thrown away.',
    '',
  );

  lines.push('## Per-archetype composite RMSE (the disengaged archetype is the test)', '');
  const archetypeDetectors = ['none', 'rt', 'rt+pattern', 'rt+dwell', 'oracle'];
  lines.push(
    mdTable(
      [
        'archetype',
        'n',
        ...archetypeDetectors.map((id) => detectors.find((d) => d.id === id)!.label),
      ],
      PERSONA_ARCHETYPES.map((archetype) => {
        const group = sessions.filter((s) => s.persona.archetype === archetype);
        const groupTruth = group.map((s) => s.persona.thetaMean);
        return [
          archetype,
          String(group.length),
          ...archetypeDetectors.map((id) => {
            const detector = detectors.find((d) => d.id === id)!;
            const estimates = group.map((session) => {
              const flags = detector.flags(session);
              const kept: ScoredResponse[] = [];
              session.standing.forEach((trial, i) => {
                if (!flags[i]) kept.push({ irt: trial.irt, correct: trial.correct });
              });
              return estimateThetaEap(kept).theta;
            });
            return fmt(rmse(groupTruth, estimates));
          }),
        ];
      }),
    ),
    '',
  );

  const { mdPath, jsonPath } = writeArtifact({
    outDir,
    name: 'experiment-3-engagement-detectors',
    lines,
    seed,
    json: {
      experiment: 'engagement detector specification',
      startedAt,
      n,
      rapidGuessThresholdMs: bank.rapidGuessThresholdMs,
      dwellThreshold: DWELL_THRESHOLD,
      dwellSeparations: DWELL_SEPARATIONS,
      scoringMismatches,
      baselineAnchorReproduced: anchorOk,
      detectors: summaries.map((s) => ({
        ...s,
        sensitivity: round(s.sensitivity, 4),
        specificity: round(s.specificity, 4),
        precision: round(s.precision, 4),
        excludedShare: round(s.excludedShare, 4),
        rmse: round(s.rmse, 4),
        bias: round(s.bias, 4),
        pearson: round(s.pearson, 4),
        meanSe: round(s.meanSe, 4),
        gapClosed: round(s.gapClosed, 4),
      })),
    },
  });

  console.log(lines.join('\n'));
  console.log('');
  console.log(`report (md):   ${mdPath}`);
  console.log(`report (json): ${jsonPath}`);
}

main();
