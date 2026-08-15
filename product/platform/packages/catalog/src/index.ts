/**
 * The bank compiler: JSONL on disk to type records, items, answer keys, and a selection index.
 *
 * Reads the filesystem and nothing else. `store` persists what this produces and `selection` reads
 * the index it produces, but neither depends on this package, so a publish can be compiled and
 * inspected without a table or a bucket in existence.
 */

export * from './compile.js';
export * from './serialize.js';
export * from './ui-requirement.js';
