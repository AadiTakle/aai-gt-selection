import type {
  AgeBand,
  BankSnapshot,
  Domain,
  ItemGenerator,
  ItemUsage,
  ReadingLoad,
  SnapshotEntry,
} from '@gt/contracts';
import { validateGenerator } from './validation.js';

const READING_ORDER: Record<ReadingLoad, number> = { none: 0, low: 1, high: 2 };

function key(id: string, version: string): string {
  return `${id}@${version}`;
}

export interface SnapshotRequest {
  label: string;
  createdBy: string;
  /** Omit to include every published, non-deprecated generator at its newest version. */
  entries?: readonly SnapshotEntry[];
}

/**
 * The library. Holds every version ever published and hands out frozen snapshots.
 *
 * The single rule that makes concurrent editing safe: `publish` only ever adds. Nothing in
 * this class mutates or removes a published version, so a screener holding a snapshot is
 * reading content that cannot change underneath it.
 */
export class ItemLibrary {
  private readonly generators = new Map<string, ItemGenerator>();
  private readonly snapshots = new Map<string, BankSnapshot>();
  private snapshotCounter = 0;

  /**
   * Add a generator version. Rejects a re-publish of an existing version, because that is
   * the one operation that would break the immutability the rest of the design assumes.
   */
  publish(gen: ItemGenerator): void {
    const k = key(gen.id, gen.version);
    if (this.generators.has(k)) {
      throw new Error(
        `${k} is already published. Published versions are immutable, so bump the version instead.`,
      );
    }
    const result = validateGenerator(gen);
    if (!result.publishable) {
      const errs = result.issues.filter((i) => i.severity === 'error').map((i) => `${i.check}: ${i.message}`);
      throw new Error(`${k} failed validation:\n  ${errs.join('\n  ')}`);
    }
    this.generators.set(k, gen);
  }

  /** Publish without validating. Test-only, so a deliberately broken generator can be examined. */
  publishUnchecked(gen: ItemGenerator): void {
    this.generators.set(key(gen.id, gen.version), gen);
  }

  get(id: string, version: string): ItemGenerator | undefined {
    return this.generators.get(key(id, version));
  }

  all(): readonly ItemGenerator[] {
    return [...this.generators.values()];
  }

  /**
   * Mark a generator version deprecated. Existing snapshots keep serving it, which is the
   * whole reason removal is expressed this way. New snapshots will skip it.
   */
  deprecate(id: string, version: string, note: string): void {
    const k = key(id, version);
    const gen = this.generators.get(k);
    if (!gen) throw new Error(`cannot deprecate ${k}: not published`);
    // Replacing the entry with a status-changed copy is not a content mutation. The render
    // function and every parameter are carried over untouched.
    this.generators.set(k, { ...gen, status: 'deprecated', deprecationNote: note });
  }

  /** Newest published, non-deprecated version of each generator id. */
  latestPublished(): readonly ItemGenerator[] {
    const best = new Map<string, ItemGenerator>();
    for (const gen of this.generators.values()) {
      if (gen.status !== 'published') continue;
      const incumbent = best.get(gen.id);
      if (!incumbent || compareSemver(gen.version, incumbent.version) > 0) best.set(gen.id, gen);
    }
    return [...best.values()];
  }

  createSnapshot(req: SnapshotRequest): BankSnapshot {
    const entries: SnapshotEntry[] =
      req.entries?.map((e) => ({ ...e })) ??
      this.latestPublished().map((g) => ({ generatorId: g.id, generatorVersion: g.version }));

    if (entries.length === 0) throw new Error('cannot create an empty snapshot');

    for (const e of entries) {
      const gen = this.get(e.generatorId, e.generatorVersion);
      if (!gen) throw new Error(`snapshot references ${key(e.generatorId, e.generatorVersion)}, which is not published`);
    }

    this.snapshotCounter += 1;
    const snapshot: BankSnapshot = Object.freeze({
      id: `snap-${String(this.snapshotCounter).padStart(4, '0')}`,
      label: req.label,
      createdAt: new Date().toISOString(),
      createdBy: req.createdBy,
      entries: Object.freeze(entries),
    });
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  getSnapshot(id: string): BankSnapshot | undefined {
    return this.snapshots.get(id);
  }

  allSnapshots(): readonly BankSnapshot[] {
    return [...this.snapshots.values()];
  }

  /**
   * Resolve a snapshot to the generators a given consumer may serve.
   *
   * Named for consumers rather than for screeners on purpose: a practice tool, a diagnostic and
   * a screener all call this with different filters, and the library has no opinion about which
   * of them is asking beyond what the filters say.
   *
   * A snapshot entry that no longer resolves is a hard error rather than a silent skip, since
   * that would mean the immutability guarantee had been violated somewhere.
   */
  resolveForConsumer(
    snapshotId: string,
    filters: {
      ageBand: AgeBand;
      maxReadingLoad: ReadingLoad;
      requireCalibrated: boolean;
      /** Only families declaring this usage, or 'both', are returned. */
      usage: ItemUsage;
      /** Refuse families without a written explanation. A practice tool should set this. */
      requireExplanation?: boolean;
    },
  ): readonly ItemGenerator[] {
    const snapshot = this.getSnapshot(snapshotId);
    if (!snapshot) throw new Error(`unknown snapshot ${snapshotId}`);

    const out: ItemGenerator[] = [];
    for (const entry of snapshot.entries) {
      const gen = this.get(entry.generatorId, entry.generatorVersion);
      if (!gen) {
        throw new Error(
          `snapshot ${snapshotId} pins ${key(entry.generatorId, entry.generatorVersion)}, which is missing from the library`,
        );
      }
      if (!gen.ageBands.includes(filters.ageBand)) continue;
      if (READING_ORDER[gen.readingLoad] > READING_ORDER[filters.maxReadingLoad]) continue;
      if (filters.requireCalibrated && gen.difficulty.source !== 'calibrated') continue;
      // The partition. A family declaring one usage is invisible to the other consumer, which
      // is what stops a practice tool coaching candidates on a screener's own item families.
      if (filters.usage !== 'both' && gen.usage !== 'both' && gen.usage !== filters.usage) continue;
      if (filters.requireExplanation && !gen.render(1).explanation) continue;
      out.push(gen);
    }
    return out;
  }

  byDomain(gens: readonly ItemGenerator[]): Record<Domain, ItemGenerator[]> {
    const out = { quantitative: [], verbal: [], spatial: [], fluid: [] } as Record<Domain, ItemGenerator[]>;
    for (const g of gens) out[g.domain].push(g);
    return out;
  }
}

export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
