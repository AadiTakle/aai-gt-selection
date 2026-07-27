// @gt-selection/item-bank — standardized, server-scored item bank.
// Implements docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic only
// (RES-013): every item carries syntheticOnly=true, validated=false.
// Structure-agnostic: this package defines item primitives only; it hard-codes
// no adaptive/two-stage sequencing.

export * from './enums';
export * from './irt';
export * from './answer';
export * from './scoring';
export * from './provenance';
export * from './content/primitives';
export {
  ITEM_CONTENT_REGISTRY,
  MATERIALIZABLE_TYPE_CODES,
  itemContentSchema,
  renderableContentSchema,
} from './content/registry';
export type {
  ItemContent,
  MaterializableTypeCode,
  RenderableContent,
} from './content/registry';
export {
  bankItemSchema,
  servedItemV2Schema,
  toServedItem,
  findAnswerLeak,
  FORBIDDEN_CLIENT_KEYS,
} from './bank-item';
export type { BankItem, ServedItemV2 } from './bank-item';
export { itemModelSchema, ITEM_MODELS, ALL_ITEM_MODELS } from './type-registry';
export type { ItemModel } from './type-registry';
export {
  MASTER_TYPES_SHA256,
  TYPE_CODES,
  DOMAIN_BY_TYPE,
  VALID_DOMAINS,
} from './generated/type-registry.generated';
export type { QuestionTypeCode, Domain } from './generated/type-registry.generated';
export { GENERATORS } from './generators';
export type { GenDraft, Generator } from './generators';
export { buildBankItem } from './builder';
export {
  SOLVERS,
  solveSeries,
  solveFunc,
  solveMatrix,
  solveAnalogy,
  solveRoll,
  solveMaze,
} from './solvers';
export { makeRng, deterministicUuid, hashStringToInt, mulberry32 } from './rng';
