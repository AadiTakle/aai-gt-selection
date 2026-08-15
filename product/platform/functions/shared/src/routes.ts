import { bankRoutes } from '@gt/qbank/wire';

/**
 * Every route the platform serves, in one place.
 *
 * The CDK stack and the local dev router both read this, because they had already drifted once: the stack
 * spelled out `/v1/sessions/*` while the handlers had moved to the bank contract, and nothing failed until a
 * test happened to assert a path. A route table that exists twice is a route table that disagrees with
 * itself.
 *
 * Paths use API Gateway's `{param}` syntax, which is also what the local router matches against, so the two
 * cannot interpret a path differently either.
 */

export type FunctionName = 'catalog' | 'serve' | 'score' | 'admin';

export interface RouteDefinition {
  readonly method: 'GET' | 'POST' | 'PUT';
  readonly path: string;
  /** Which handler serves it. */
  readonly fn: FunctionName;
  /** Admin routes take IAM SigV4; everything else takes an app key. */
  readonly auth: 'app-key' | 'iam';
  /** Used as the CDK construct id, so it must be stable and unique. */
  readonly id: string;
}

/** `/api/bank/sessions/{sessionId}/next` from the contract's builder, which produces a concrete URL. */
function templated(built: string): string {
  return built.replace(/\/sessions\/[^/]+/, '/sessions/{sessionId}');
}

export const ROUTES: readonly RouteDefinition[] = [
  // The bank contract. Shapes and paths are Felipe's; only the storage behind them is the platform's.
  { method: 'GET', path: bankRoutes.catalogue(), fn: 'catalog', auth: 'app-key', id: 'BankCatalogue' },
  { method: 'POST', path: bankRoutes.createSession(), fn: 'serve', auth: 'app-key', id: 'CreateSession' },
  { method: 'GET', path: templated(bankRoutes.next('x')), fn: 'serve', auth: 'app-key', id: 'NextItem' },
  { method: 'POST', path: templated(bankRoutes.answer('x')), fn: 'score', auth: 'app-key', id: 'AnswerItem' },

  /**
   * Outside the contract, which has no notion of any of these.
   *
   * `/debug` is the contract's fifth route and is deliberately absent: it reports the posterior mean, and an
   * app key is embedded in a game client.
   */
  { method: 'POST', path: '/v1/sessions/{sessionId}/abandon', fn: 'score', auth: 'app-key', id: 'AbandonSession' },
  { method: 'GET', path: '/v1/sessions/{sessionId}/sheet', fn: 'score', auth: 'app-key', id: 'ReadSheet' },
  { method: 'GET', path: '/v1/catalog/types', fn: 'catalog', auth: 'app-key', id: 'CatalogTypes' },
  { method: 'GET', path: '/v1/catalog/types/{typeCode}', fn: 'catalog', auth: 'app-key', id: 'CatalogType' },
  { method: 'GET', path: '/v1/catalog/app', fn: 'catalog', auth: 'app-key', id: 'CatalogApp' },

  { method: 'POST', path: '/v1/admin/catalog/publish', fn: 'admin', auth: 'iam', id: 'AdminPublish' },
  { method: 'POST', path: '/v1/admin/apps', fn: 'admin', auth: 'iam', id: 'AdminCreateApp' },
  { method: 'PUT', path: '/v1/admin/apps/{appId}/types/{typeCode}', fn: 'admin', auth: 'iam', id: 'AdminApproveType' },
  { method: 'POST', path: '/v1/admin/items/{itemId}/revise', fn: 'admin', auth: 'iam', id: 'AdminReviseItem' },
];

export interface RouteMatch {
  readonly route: RouteDefinition;
  readonly pathParameters: Record<string, string>;
}

/**
 * Match a concrete path against the table, extracting `{param}` segments.
 *
 * Longest literal prefix wins, so `/api/bank` cannot swallow `/api/bank/sessions`. Segment counts must match
 * exactly: a template with three segments never matches a path with four, which is what stops
 * `/v1/catalog/types` from claiming `/v1/catalog/types/FLU-MATRIX-01`.
 */
export function matchRoute(method: string, path: string): RouteMatch | null {
  const wanted = path.split('/').filter(Boolean);

  for (const route of ROUTES) {
    if (route.method !== method.toUpperCase()) continue;
    const template = route.path.split('/').filter(Boolean);
    if (template.length !== wanted.length) continue;

    const pathParameters: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < template.length; i += 1) {
      const part = template[i] as string;
      const actual = wanted[i] as string;
      if (part.startsWith('{') && part.endsWith('}')) {
        pathParameters[part.slice(1, -1)] = decodeURIComponent(actual);
        continue;
      }
      if (part !== actual) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, pathParameters };
  }

  return null;
}
