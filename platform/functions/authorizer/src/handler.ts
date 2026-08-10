import { createHash } from 'node:crypto';
import { deps, log } from '@platform/shared';

/**
 * Resolve an app from its API key.
 *
 * The key is stored only as a SHA-256 digest, so a dump of the registry does not yield working
 * credentials. Keys are separate rows from the app config, which is what lets one rotate without the
 * app losing its identity, its approved types, or its session history.
 *
 * An app key is embedded in a Roblox place or a web bundle and must be treated as public. It
 * establishes which app is calling, not that the caller is trustworthy — which is why the admin
 * routes do not accept one at all, and why every session read is scoped by the identity resolved
 * here rather than by anything in a request body.
 */

interface SimpleAuthorizerResponse {
  readonly isAuthorized: boolean;
  readonly context?: Record<string, string>;
}

const DENY: SimpleAuthorizerResponse = { isAuthorized: false };

export async function handler(event: Record<string, unknown>): Promise<SimpleAuthorizerResponse> {
  const headers = (event.headers ?? {}) as Record<string, string | undefined>;
  const presented =
    headers['x-api-key'] ??
    headers['X-Api-Key'] ??
    (typeof event.identitySource === 'object' && Array.isArray(event.identitySource)
      ? (event.identitySource[0] as string | undefined)
      : undefined);

  if (!presented) {
    log({ level: 'warn', authorizer: 'deny', reason: 'no key presented' });
    return DENY;
  }

  const keyHash = createHash('sha256').update(presented).digest('hex');

  try {
    const d = deps();
    const appId = await d.store.resolveApiKey(keyHash);
    if (!appId) {
      log({ level: 'warn', authorizer: 'deny', reason: 'unknown key' });
      return DENY;
    }

    const app = await d.store.getApp(appId);
    if (!app || app.status !== 'active') {
      log({ level: 'warn', authorizer: 'deny', reason: 'app missing or disabled', appId });
      return DENY;
    }

    log({ level: 'info', authorizer: 'allow', appId });
    return { isAuthorized: true, context: { appId } };
  } catch (error) {
    // Failing closed. An authorizer that allows on error is an authorizer that allows during an
    // outage.
    log({
      level: 'error',
      authorizer: 'deny',
      reason: 'lookup failed',
      message: error instanceof Error ? error.message : String(error),
    });
    return DENY;
  }
}
