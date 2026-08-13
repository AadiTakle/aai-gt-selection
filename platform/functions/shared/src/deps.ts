import { AnswerKeyStore, PersonaStore, PlatformStore } from '@platform/store';
import { readEnv, type PlatformEnv } from './env.js';

/**
 * Clients, constructed once per execution environment.
 *
 * A DynamoDB client built per request pays TLS setup on every question a child answers. Building at
 * module scope means the second request in a warm environment reuses the connection, which is the
 * single largest latency difference available for free.
 *
 * The token secret is read from the environment rather than fetched from Secrets Manager on the
 * request path. The deployed stack injects it, and a secret fetch per request would be both slower
 * and a second thing that can fail while a child waits.
 */

export interface Deps {
  readonly env: PlatformEnv;
  readonly store: PlatformStore;
  readonly answerKeys: AnswerKeyStore;
  readonly personas: PersonaStore;
}

let cached: Deps | null = null;

export function deps(): Deps {
  if (cached) return cached;
  const env = readEnv();
  cached = {
    env,
    store: new PlatformStore({
      tableName: env.tableName,
      answerKeyTableName: env.answerKeyTableName,
      personaTableName: env.personaTableName,
      endpoint: env.endpoint ?? undefined,
      region: env.region,
    }),
    answerKeys: new AnswerKeyStore({
      answerKeyTableName: env.answerKeyTableName,
      endpoint: env.endpoint ?? undefined,
      region: env.region,
    }),
    personas: new PersonaStore({
      personaTableName: env.personaTableName,
      endpoint: env.endpoint ?? undefined,
      region: env.region,
    }),
  };
  return cached;
}

/** Tests re-point the clients at DynamoDB Local between suites. */
export function resetDeps(): void {
  cached = null;
}
