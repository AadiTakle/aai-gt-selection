// Throwaway evidence script: recursively enumerate every OBJECT KEY appearing anywhere in the
// /api/exam-items HTTP payload and flag any that look like an answer key or scoring rule.
// Values are ignored; only key names are inspected, so an English word like "answer" appearing
// as option text cannot produce a false positive.
import { readFileSync } from 'node:fs';

const payload = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const keyCounts = new Map();

function walk(node) {
  if (Array.isArray(node)) {
    for (const child of node) walk(child);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    walk(value);
  }
}

walk(payload.items);

const suspicious = /^(answer|answerKey|answer_key|correctKey|correct_key|solution|scoring|correctIndex|correctOptionId|key)$/i;
const hits = [...keyCounts.entries()].filter(([key]) => suspicious.test(key));

console.log('items scanned:', payload.count);
console.log('distinct object keys anywhere in payload:', keyCounts.size);
console.log('ANSWER-KEY-LIKE KEY NAMES FOUND:', hits.length === 0 ? 'NONE' : JSON.stringify(hits));

// `key` is a legitimate structural field on bins/options, so report it separately for honesty.
const structural = [...keyCounts.entries()].filter(([k]) => k === 'key');
console.log('note - structural "key" fields (bin/option identifiers):', JSON.stringify(structural));
