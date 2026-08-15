/**
 * HTTP plumbing for API Gateway HTTP API (payload format 2.0).
 *
 * Deliberately thin. Handlers should read as the sequence of domain operations they perform, and
 * anything that turns an exception into a status code belongs here rather than repeated in five
 * functions.
 */

export interface ApiRequest {
  readonly method: string;
  readonly path: string;
  readonly pathParameters: Readonly<Record<string, string | undefined>>;
  readonly query: Readonly<Record<string, string | undefined>>;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body: string | null;
  /**
   * Resolved by the authorizer, never read from the request body. Every session read is filtered by
   * this, which is what stops one app reading another's sessions.
   */
  readonly appId: string | null;
}

export interface ApiResponse {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly detail?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (m: string, d?: Record<string, unknown>) => new HttpError(400, m, d);
export const unauthorized = (m = 'unauthorized') => new HttpError(401, m);
export const forbidden = (m = 'forbidden') => new HttpError(403, m);
export const notFound = (m = 'not found') => new HttpError(404, m);
export const conflict = (m: string, d?: Record<string, unknown>) => new HttpError(409, m, d);
export const unprocessable = (m: string, d?: Record<string, unknown>) => new HttpError(422, m, d);

export function json(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  };
}

export const ok = (body: unknown) => json(200, body);
export const created = (body: unknown) => json(201, body);

/** Parse an event from either API Gateway HTTP API 2.0 or a direct test invocation. */
export function toApiRequest(event: Record<string, unknown>): ApiRequest {
  const requestContext = (event.requestContext ?? {}) as Record<string, unknown>;
  const http = (requestContext.http ?? {}) as Record<string, unknown>;
  const authorizer = (requestContext.authorizer ?? {}) as Record<string, unknown>;
  const lambdaAuth = (authorizer.lambda ?? authorizer) as Record<string, unknown>;

  const rawBody = typeof event.body === 'string' ? event.body : null;
  const body =
    rawBody !== null && event.isBase64Encoded === true
      ? Buffer.from(rawBody, 'base64').toString('utf8')
      : rawBody;

  return {
    method: typeof http.method === 'string' ? http.method : String(event.httpMethod ?? 'GET'),
    path: typeof http.path === 'string' ? http.path : String(event.rawPath ?? event.path ?? '/'),
    pathParameters: (event.pathParameters ?? {}) as Record<string, string | undefined>,
    query: (event.queryStringParameters ?? {}) as Record<string, string | undefined>,
    headers: normaliseHeaders(event.headers),
    body,
    appId: typeof lambdaAuth.appId === 'string' ? lambdaAuth.appId : null,
  };
}

function normaliseHeaders(raw: unknown): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      out[key.toLowerCase()] = value === undefined ? undefined : String(value);
    }
  }
  return out;
}

export function parseJsonBody<T>(request: ApiRequest): T {
  if (!request.body) throw badRequest('a JSON body is required');
  try {
    return JSON.parse(request.body) as T;
  } catch {
    throw badRequest('body is not valid JSON');
  }
}

export function requireAppId(request: ApiRequest): string {
  if (!request.appId) throw unauthorized('no app identity on the request');
  return request.appId;
}

export function requirePathParam(request: ApiRequest, name: string): string {
  const value = request.pathParameters[name];
  if (!value) throw badRequest(`missing path parameter ${name}`);
  return value;
}

/**
 * One structured line per request, with the identifiers needed to reconstruct a session after the
 * fact. Never the response body: an item's content is large and a response could carry telemetry.
 */
export function log(fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ at: new Date().toISOString(), ...fields }));
}

/** Turn a thrown `HttpError` into a response and anything else into a 500 that says nothing. */
export async function handle(
  event: Record<string, unknown>,
  run: (request: ApiRequest) => Promise<ApiResponse>,
): Promise<ApiResponse> {
  const request = toApiRequest(event);
  const started = Date.now();
  try {
    const response = await run(request);
    log({
      level: 'info',
      method: request.method,
      path: request.path,
      appId: request.appId,
      status: response.statusCode,
      ms: Date.now() - started,
    });
    return response;
  } catch (error) {
    if (error instanceof HttpError) {
      log({
        level: 'warn',
        method: request.method,
        path: request.path,
        appId: request.appId,
        status: error.statusCode,
        message: error.message,
        detail: error.detail,
        ms: Date.now() - started,
      });
      return json(error.statusCode, { error: error.message, ...(error.detail ?? {}) });
    }
    log({
      level: 'error',
      method: request.method,
      path: request.path,
      appId: request.appId,
      status: 500,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ms: Date.now() - started,
    });
    return json(500, { error: 'internal error' });
  }
}
