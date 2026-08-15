/**
 * The one typed client for the adaptive engine.
 *
 * Four clients used to hand-roll this: two `api()` helpers in the lab apps, one in `BankScreener.tsx`, one in
 * the character app. Each re-declared the response shapes, each built its own URLs, and each handled errors
 * slightly differently — one of them read `res.json()` without checking `res.ok`, so a 400 arrived as an
 * object with an `error` key and was rendered as a session.
 *
 * Browser-safe: types only from the contract, `fetch` from the platform, nothing from the bank loader.
 */

import {
  type AnswerRequest,
  type AnswerResponse,
  type BankCatalogueResponse,
  type CreateSessionRequest,
  type CreateSessionResponse,
  type DebugResponse,
  type NextResponse,
  bankRoutes,
  isErrorResponse,
} from './wire.js';

/**
 * A failed request, carrying the status so a caller can tell "you asked for a type that does not exist" (400)
 * from "that session is gone" (404) — which matters now that sessions live in a `Map` and vanish with the
 * process.
 */
export class BankApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly path: string,
  ) {
    super(message);
    this.name = 'BankApiError';
  }
}

export interface BankClientOptions {
  /** Prefix for every path. Empty for a same-origin browser app; a full origin for anything else. */
  readonly baseUrl?: string;
  /** Injectable for tests and for a host that wants timeouts, retries or auth headers. */
  readonly fetch?: typeof globalThis.fetch;
}

/**
 * A client bound to one server.
 *
 * Every method either returns the parsed body or throws `BankApiError`. There is no third outcome, and in
 * particular there is no shape where an error body is returned as data — the previous hand-rolled versions
 * allowed exactly that.
 */
export class BankClient {
  private readonly baseUrl: string;
  private readonly doFetch: typeof globalThis.fetch;

  constructor(options: BankClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/$/, '');
    this.doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private async request<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.doFetch(`${this.baseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new BankApiError(response.status, `${path} returned a body that is not JSON`, path);
    }

    // Checked before the status, because a 2xx carrying an `error` key would otherwise be handed back as data.
    if (!response.ok || isErrorResponse(parsed)) {
      const message = isErrorResponse(parsed) ? parsed.error : `${path} failed with ${response.status}`;
      throw new BankApiError(response.status, message, path);
    }
    return parsed as T;
  }

  /** What the bank holds, and the precision steps a session can be configured with. */
  catalogue(): Promise<BankCatalogueResponse> {
    return this.request<BankCatalogueResponse>(bankRoutes.catalogue());
  }

  createSession(request: CreateSessionRequest = {}): Promise<CreateSessionResponse> {
    // `{}` and not `undefined`: the request has to be a POST even when every field is defaulted.
    return this.request<CreateSessionResponse>(bankRoutes.createSession(), request);
  }

  next(sessionId: string): Promise<NextResponse> {
    return this.request<NextResponse>(bankRoutes.next(sessionId));
  }

  answer(sessionId: string, request: AnswerRequest): Promise<AnswerResponse> {
    return this.request<AnswerResponse>(bankRoutes.answer(sessionId), request);
  }

  debug(sessionId: string): Promise<DebugResponse> {
    return this.request<DebugResponse>(bankRoutes.debug(sessionId));
  }
}
