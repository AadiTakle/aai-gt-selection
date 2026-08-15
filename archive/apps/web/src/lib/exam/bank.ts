/**
 * UI-facing metadata for the wired question types.
 *
 * The pool is DERIVED from `registry.generated.ts`, which
 * `scripts/sync-exam-demos.mjs` regenerates from the banks + renderer demos.
 * Adding a type is therefore a matter of dropping in
 * `banks/<CODE>.jsonl` + a protocol-compliant `demos/<CODE>.html` and re-running
 * the sync — nothing here needs editing.
 *
 * The engine (`nextType`/`nextItem`) decides the actual running order; the
 * interleaved order below is only a stable, domain-balanced display order.
 */

import { EXAM_TYPE_REGISTRY, type ExamRegistryEntry } from './registry.generated';

export type ExamDomain = 'fluid_reasoning' | 'verbal' | 'quantitative' | 'spatial';

export interface ExamBankItem {
  typeCode: string;
  domain: ExamDomain;
  title: string;
  blurb: string;
  demoPath: string;
}

export const DOMAIN_LABEL: Record<ExamDomain, string> = {
  fluid_reasoning: 'Fluid reasoning',
  verbal: 'Verbal',
  quantitative: 'Quantitative',
  spatial: 'Spatial',
};

/** All four domains, in display order. */
export const EXAM_DOMAINS: ExamDomain[] = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'];

function demo(typeCode: string): string {
  return `/exam-demos/${typeCode}.html`;
}

/** Round-robin the registry across domains so no two neighbours share a domain. */
function interleaveByDomain(entries: readonly ExamRegistryEntry[]): ExamBankItem[] {
  const queues = new Map<ExamDomain, ExamRegistryEntry[]>(EXAM_DOMAINS.map((d) => [d, []]));
  for (const entry of entries) queues.get(entry.domain)?.push(entry);

  const out: ExamBankItem[] = [];
  let remaining = entries.length;
  while (remaining > 0) {
    for (const domain of EXAM_DOMAINS) {
      const next = queues.get(domain)?.shift();
      if (!next) continue;
      remaining -= 1;
      out.push({
        typeCode: next.typeCode,
        domain: next.domain,
        title: next.title,
        blurb: next.blurb,
        demoPath: demo(next.typeCode),
      });
    }
  }
  return out;
}

/** Every wired type, domain-interleaved. Generated — see registry.generated.ts. */
export const EXAM_BANK: ExamBankItem[] = interleaveByDomain(EXAM_TYPE_REGISTRY);

/** Type metadata by code, for the runner's per-item header. */
export const EXAM_BANK_BY_CODE: ReadonlyMap<string, ExamBankItem> = new Map(
  EXAM_BANK.map((item) => [item.typeCode, item]),
);

export function domainLabel(domain: string): string {
  return DOMAIN_LABEL[domain as ExamDomain] ?? domain.replace('_', ' ');
}
