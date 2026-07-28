import type { BankItem, ExamDomain } from './item';
import type { ExamItemResult } from './types';

/**
 * The sequencing STRUCTURE is unapproved and MUST stay pluggable (project
 * guardrails: structure-agnostic). A `Sequencer` is the only thing that decides
 * *which item comes next* and *when to stop*. The session shell owns the loop and
 * knows nothing about adaptive vs two-stage vs fixed ordering.
 *
 * Swapping strategies is a one-line change at the call site, e.g.
 *   const sequencer = new FixedSequencer();
 *   // later, once a structure is approved:
 *   const sequencer = new TwoStageSequencer(...);  // implements this same interface
 *
 * A later adaptive/two-stage strategy reads `ctx.results` (responses + telemetry
 * so far) to route; `FixedSequencer` ignores them. Do NOT hard-code routing in
 * the shell or player.
 */
export interface SequencerContext {
  /** Full bank available to the session (server/module side; holds keys). */
  readonly bank: readonly BankItem[];
  /** itemIds already presented, in presentation order. */
  readonly presentedItemIds: readonly string[];
  /** Recorded results so far (for adaptive routing later). */
  readonly results: readonly ExamItemResult[];
}

export interface Sequencer {
  /** Stable identifier for logging/telemetry. */
  readonly id: string;
  /** Human-readable label for the UI/debug. */
  readonly label: string;
  /** The next item to present, or `null` to STOP the session. */
  next(ctx: SequencerContext): BankItem | null;
}

const DOMAIN_ROTATION: readonly ExamDomain[] = [
  'fluid_reasoning',
  'verbal',
  'quantitative',
  'spatial',
];

/**
 * Compute a fixed, domain-balanced presentation order: round-robin across the
 * four domains (preserving each domain's input order) so a child never gets two
 * items from the same domain back-to-back while any other domain still has items.
 * Deterministic and pure — the same bank always yields the same order.
 */
export function domainBalancedOrder(bank: readonly BankItem[]): string[] {
  const buckets = new Map<string, BankItem[]>();
  for (const item of bank) {
    const bucket = buckets.get(item.domain);
    if (bucket) bucket.push(item);
    else buckets.set(item.domain, [item]);
  }

  // Known domains first (in rotation order), then any unexpected domains.
  const domains = [
    ...DOMAIN_ROTATION.filter((d) => buckets.has(d)),
    ...[...buckets.keys()].filter((d) => !DOMAIN_ROTATION.includes(d as ExamDomain)),
  ];

  const order: string[] = [];
  const cursor = new Map<string, number>(domains.map((d) => [d, 0]));
  let placed = 0;
  while (placed < bank.length) {
    for (const domain of domains) {
      const idx = cursor.get(domain)!;
      const bucket = buckets.get(domain)!;
      if (idx < bucket.length) {
        order.push(bucket[idx]!.itemId);
        cursor.set(domain, idx + 1);
        placed += 1;
      }
    }
  }
  return order;
}

/**
 * Default strategy: present every item once, in a fixed domain-balanced order,
 * then stop. Ignores responses — it is intentionally NOT adaptive.
 */
export class FixedSequencer implements Sequencer {
  readonly id = 'fixed';
  readonly label = 'Fixed order (domain-balanced)';

  next(ctx: SequencerContext): BankItem | null {
    const order = domainBalancedOrder(ctx.bank);
    const presented = new Set(ctx.presentedItemIds);
    const nextId = order.find((id) => !presented.has(id));
    if (nextId === undefined) return null;
    return ctx.bank.find((item) => item.itemId === nextId) ?? null;
  }
}
