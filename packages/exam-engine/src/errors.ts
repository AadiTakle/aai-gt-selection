/** Thrown when `nextItem` is asked for a type that has no unseen items left in the bank. */
export class NoAvailableItemError extends Error {
  constructor(public readonly typeCode: string) {
    super(`No unseen bank item available for type "${typeCode}".`);
    this.name = 'NoAvailableItemError';
  }
}

/** Thrown when a type code is not present in the bank registry. */
export class UnknownTypeError extends Error {
  constructor(public readonly typeCode: string) {
    super(`Unknown type code "${typeCode}" (not in banks.types).`);
    this.name = 'UnknownTypeError';
  }
}
