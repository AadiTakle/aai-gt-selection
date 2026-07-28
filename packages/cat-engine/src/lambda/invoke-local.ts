/**
 * D-019 local invocation harness. Proves the SAME pure handler that would run in
 * Lambda also runs locally with no cloud, network, or AWS-SDK dependency.
 *
 * Reads a JSON `ScoringLambdaEvent` from a file path (argv[2]) or from stdin,
 * awaits `handler`, and prints the JSON response. Input/output are
 * born-synthetic (synthetic_only=true, validated=false; D-006, R9).
 *
 * Usage:
 *   tsx src/lambda/invoke-local.ts src/lambda/sample-event.json
 *   cat src/lambda/sample-event.json | tsx src/lambda/invoke-local.ts
 */

import { readFileSync } from 'node:fs';

import { handler } from './handler';
import type { ScoringLambdaEvent } from './event';

function readEvent(): ScoringLambdaEvent {
  const path = process.argv[2];
  const raw = path !== undefined ? readFileSync(path, 'utf8') : readFileSync(0, 'utf8');
  return JSON.parse(raw) as ScoringLambdaEvent;
}

async function main(): Promise<void> {
  const response = await handler(readEvent());
  console.log(JSON.stringify(response, null, 2));
  if (!response.ok) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
