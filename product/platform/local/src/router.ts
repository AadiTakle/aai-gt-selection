import { createHash } from 'node:crypto';
import { matchRoute, type FunctionName } from '@platform/shared';
import { handler as adminHandler } from '../../functions/admin/src/handler.js';
import { handler as catalogHandler } from '../../functions/catalog/src/handler.js';
import { handler as scoreHandler } from '../../functions/score/src/handler.js';
import { handler as serveHandler } from '../../functions/serve/src/handler.js';

/**
 * Run the platform's real handlers without AWS.
 *
 * Not a reimplementation and deliberately not a convenience layer: it builds the same API Gateway v2 event
 * the handlers already parse, dispatches on the shared route table, and returns what the handler returned. It
 * holds no measurement logic, no storage logic and no authorisation logic beyond resolving an app key the way
 * the deployed authorizer does.
 *
 * That is what makes it worth having. A game integrated against this is integrated against the deployed
 * platform, and going live is a base URL rather than a rewrite. The alternative — a local mock — would be a
 * second implementation of the thing being tested.
 *
 * Storage still has to exist: point `GT_DDB_ENDPOINT` at DynamoDB Local.
 */

const HANDLERS: Record<FunctionName, (event: Record<string, unknown>) => Promise<unknown>> = {
  catalog: catalogHandler,
  serve: serveHandler,
  score: scoreHandler,
  admin: adminHandler,
};

export interface LocalResponse {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export interface LocalRequest {
  readonly method: string;
  readonly path: string;
  readonly body: string | null;
  readonly headers: Readonly<Record<string, string>>;
}

export interface RouterOptions {
  /**
   * Whether IAM-authenticated routes may be reached.
   *
   * A local router cannot verify SigV4, so admin routes are gated by a flag rather than pretended to be
   * authenticated. Off by default: a dev server that publishes catalogues to anyone who finds the port is
   * not a development convenience, it is a habit that ships.
   */
  readonly allowAdmin?: boolean;
  /** Resolve an api key to an app the way the deployed authorizer does. Injected so tests can stub it. */
  readonly resolveAppId?: (keyHash: string) => Promise<string | null>;
}

function json(statusCode: number, body: unknown): LocalResponse {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  };
}

/**
 * The authorizer, locally.
 *
 * Same rule as the deployed one: hash the presented key, look it up, confirm the app is active. Failing
 * closed on any error matters as much here as there — a dev router that allows on a lookup failure teaches a
 * client that the key is optional.
 */
async function resolveApp(
  headers: Readonly<Record<string, string>>,
  options: RouterOptions,
): Promise<string | null> {
  const presented = headers['x-api-key'];
  if (!presented) return null;
  const keyHash = createHash('sha256').update(presented).digest('hex');

  if (options.resolveAppId) return options.resolveAppId(keyHash);

  const { deps } = await import('@platform/shared');
  const d = deps();
  const appId = await d.store.resolveApiKey(keyHash);
  if (!appId) return null;
  const app = await d.store.getApp(appId);
  return app && app.status === 'active' ? appId : null;
}

export async function routeLocal(
  request: LocalRequest,
  options: RouterOptions = {},
): Promise<LocalResponse> {
  const matched = matchRoute(request.method, request.path);
  if (!matched) return json(404, { error: `no route for ${request.method} ${request.path}` });

  const { route, pathParameters } = matched;

  if (route.auth === 'iam' && options.allowAdmin !== true) {
    return json(403, {
      error: 'admin routes are disabled in this router',
      hint: 'start with allowAdmin to publish a catalogue or register an app',
    });
  }

  let appId: string | null = null;
  if (route.auth === 'app-key') {
    appId = await resolveApp(request.headers, options);
    if (!appId) return json(401, { error: 'unknown or missing x-api-key' });
  }

  const event: Record<string, unknown> = {
    requestContext: {
      http: { method: route.method, path: request.path },
      ...(appId ? { authorizer: { lambda: { appId } } } : {}),
    },
    headers: request.headers,
    pathParameters,
    queryStringParameters: {},
    body: request.body,
  };

  const result = (await HANDLERS[route.fn](event)) as LocalResponse;
  return result;
}
