/**
 * The HTTP shapes come from the contract now, not from a mirror of the handlers.
 *
 * These were hand-copied from `apps/api/src/server.ts` and had fallen behind it: `SessionState` knew nothing
 * about the per-domain bands (1a.4) or the pass route (1a.7), so every experience built on this file was
 * discarding fields the engine had been returning. Re-exported under the old names so no experience had to
 * change, and aliased where the contract's name is better.
 */

// Imported as well as re-exported, because `ExperienceMeta` below refers to it.
import type { AgeBand } from '@gt/qbank';

export {
  AGE_BANDS,
  bankRoutes,
  BankClient,
  BankApiError,
  isErrorResponse,
} from '@gt/qbank';
export type {
  AgeBand,
  BankCatalogueResponse as BankSummary,
  QbankServe as Serve,
  QbankState as SessionState,
  PrecisionSetting as PrecisionStep,
  DomainBand,
  PassRoute,
} from '@gt/qbank';

/** A palette applied to the item iframe so a served item matches the world around it. */
export type Palette = Readonly<Record<string, string>>;

/**
 * What an experience declares about itself, so the launcher can describe it without being edited by
 * every worker in turn.
 */
export interface ExperienceMeta {
  readonly id: string;
  readonly title: string;
  /** The franchise or world it is dressed as. */
  readonly world: string;
  readonly band: AgeBand;
  /** One line on the mechanic doing the pulling. */
  readonly pull: string;
  readonly accent: string;
}
