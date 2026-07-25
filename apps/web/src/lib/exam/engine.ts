import { EXAM_BANK, type ExamBankItem, type ExamDomain } from './bank';
import {
  EXAM_DOMAINS,
  GRADE_BAND_START_DIFFICULTY,
  clampDifficulty,
  syntheticId,
  type GradeBand,
  type ScoredItem,
  type ServedItem,
} from './contract';

/**
 * Adaptive engine (BUILD_PLAN §3).
 *
 * The real engine ships in `packages/exam-engine` (pure + tested). Until that
 * package resolves, this is a LOCAL STUB with the exact same signatures and a
 * simple placeholder policy so the app runs. At integration, swap:
 *
 *   import { examEngine } from '@gt-selection/exam-engine';
 *
 * for the local `examEngine` export below (identical `ExamEngine` shape).
 */

export interface AreaState {
  area: ExamDomain;
  /** Student proficiency in this area — FLOAT 1..20 (BUILD_PLAN §0). */
  difficulty: number;
  /** typeCodes already served in this area (no repeats). */
  itemsSeen: string[];
  /** Recent per-item accuracy (0..1) — the running window for the stop rule. */
  accWindow: number[];
  /** How many times each metric has been observed (coverage tracking). */
  metricCounts: Record<string, number>;
}

export interface SessionState {
  gradeBand: GradeBand;
  areas: Record<ExamDomain, AreaState>;
  count: number;
}

export interface ExamEngine {
  startState(gradeBand: GradeBand): SessionState;
  nextType(state: SessionState, banks: ExamBankItem[]): string | null;
  nextItem(state: SessionState, typeCode: string, banks: ExamBankItem[]): ServedItem;
  update(state: SessionState, scored: ScoredItem): SessionState;
  isDone(state: SessionState): boolean;
}

// Stub policy constants. Length is variable between MIN and MAX; the current
// 8-demo bank bounds MAX. These tighten once the bank scales to all 66 types.
const MIN_ITEMS = 4; // enough to sample every area at least once
const MAX_ITEMS = 8; // bounded by the legacy bank size
const CONFIDENT_MARGIN = 0.35; // |mean accuracy − 0.5| beyond which an area is "placed"

function unseenInArea(banks: ExamBankItem[], state: SessionState, area: ExamDomain): ExamBankItem[] {
  const seen = state.areas[area].itemsSeen;
  return banks.filter((b) => b.domain === area && !seen.includes(b.typeCode));
}

function createStubEngine(): ExamEngine {
  return {
    startState(gradeBand: GradeBand): SessionState {
      const areas = {} as Record<ExamDomain, AreaState>;
      for (const area of EXAM_DOMAINS) {
        areas[area] = {
          area,
          difficulty: GRADE_BAND_START_DIFFICULTY[gradeBand],
          itemsSeen: [],
          accWindow: [],
          metricCounts: {},
        };
      }
      return { gradeBand, areas, count: 0 };
    },

    nextType(state: SessionState, banks: ExamBankItem[]): string | null {
      // Even spread first: pick the area with the fewest items seen that still
      // has unseen types; tie-break toward the lower current difficulty.
      let best: AreaState | null = null;
      let bestUnseen: ExamBankItem[] = [];
      for (const area of EXAM_DOMAINS) {
        const unseen = unseenInArea(banks, state, area);
        if (unseen.length === 0) continue;
        const st = state.areas[area];
        const better =
          !best ||
          st.itemsSeen.length < best.itemsSeen.length ||
          (st.itemsSeen.length === best.itemsSeen.length && st.difficulty < best.difficulty);
        if (better) {
          best = st;
          bestUnseen = unseen;
        }
      }
      if (!best) return null;
      // Deterministic pick. Once bank items carry per-item difficulty, choose the
      // unseen type whose difficulty is closest to `best.difficulty`.
      bestUnseen.sort((a, b) => a.typeCode.localeCompare(b.typeCode));
      return bestUnseen[0]?.typeCode ?? null;
    },

    nextItem(state: SessionState, typeCode: string, banks: ExamBankItem[]): ServedItem {
      const bankItem = banks.find((b) => b.typeCode === typeCode);
      if (!bankItem) throw new Error(`nextItem: unknown typeCode "${typeCode}"`);
      const area = state.areas[bankItem.domain];
      return {
        itemId: syntheticId('ITEM'),
        typeCode: bankItem.typeCode,
        domain: bankItem.domain,
        difficulty: clampDifficulty(area.difficulty),
        ageBands: [state.gradeBand],
        demoPath: bankItem.demoPath,
        content: { legacy: true, title: bankItem.title, blurb: bankItem.blurb },
        syntheticOnly: true,
      };
    },

    update(state: SessionState, scored: ScoredItem): SessionState {
      const area = state.areas[scored.domain];
      // Gradual ± by correctness × magnitude, clamped 1..20 (BUILD_PLAN §3).
      const signed = (scored.score - 0.5) * 2; // [-1, 1]
      let step = 0.4 + 0.6 * Math.abs(signed); // [0.4, 1.0]
      const errType = scored.metrics['M-ERRTYPE'];
      if (!scored.correct && errType === 2) step += 0.3; // random miss pushes down harder
      if (!scored.correct && errType === 1) step *= 0.6; // near miss softens the drop
      const delta = Math.sign(signed) * step;

      const nextArea: AreaState = {
        area: area.area,
        difficulty: clampDifficulty(area.difficulty + delta),
        itemsSeen: area.itemsSeen.includes(scored.typeCode)
          ? area.itemsSeen
          : [...area.itemsSeen, scored.typeCode],
        accWindow: [...area.accWindow, scored.score],
        metricCounts: { ...area.metricCounts },
      };
      for (const key of Object.keys(scored.metrics)) {
        nextArea.metricCounts[key] = (nextArea.metricCounts[key] ?? 0) + 1;
      }

      const areas: Record<ExamDomain, AreaState> = { ...state.areas };
      areas[scored.domain] = nextArea;
      return { gradeBand: state.gradeBand, areas, count: state.count + 1 };
    },

    isDone(state: SessionState): boolean {
      if (state.count >= MAX_ITEMS) return true;
      const areasList = EXAM_DOMAINS.map((a) => state.areas[a]);
      const allSampled = areasList.every((a) => a.itemsSeen.length >= 1);
      if (!allSampled || state.count < MIN_ITEMS) return false;
      // Adequate coverage today = every area sampled AND every area confidently
      // placed (stand-in for M-CONSIST / SE-below-threshold in the real engine).
      return areasList.every((a) => {
        const mean = a.accWindow.length
          ? a.accWindow.reduce((x, y) => x + y, 0) / a.accWindow.length
          : 0.5;
        return Math.abs(mean - 0.5) >= CONFIDENT_MARGIN;
      });
    },
  };
}

/** Local stub instance. Replace with the `@gt-selection/exam-engine` export. */
export const examEngine: ExamEngine = createStubEngine();

/** Convenience: the runtime bank the runner drives the engine over. */
export { EXAM_BANK };
