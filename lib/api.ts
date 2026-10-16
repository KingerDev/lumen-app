import { config } from '@/lib/config';
import { lang, t } from '@/lib/i18n';

/**
 * Thin HTTP client for the Lumen API.
 *
 * Deliberately not a generated SDK — the surface is a dozen endpoints and the
 * shapes already live in types/index.ts. What this adds is the bearer token,
 * consistent error objects and a timeout, so callers never have to think about
 * any of it.
 */

/** Requests that outlive this are almost certainly a dead connection. */
const TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Laravel's per-field validation messages, when it sent any. */
    readonly errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The token is gone or was revoked — the app has to log in again. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  /** No response at all: offline, DNS failure, server down. */
  get isOffline(): boolean {
    return this.status === 0;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** query string parameters; undefined values are dropped */
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = config.apiUrl.replace(/\/$/, '');
  const url = new URL(`${base}/api/${path.replace(/^\//, '')}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!config.apiUrl) {
    throw new ApiError(t.errors.noApiUrl, 0);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Caller-supplied cancellation has to compose with our timeout, not replace it.
  options.signal?.addEventListener('abort', () => controller.abort());

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        // Messages the app shows straight from the server come in its language.
        'Accept-Language': lang,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(
      controller.signal.aborted ? t.errors.timeout : t.errors.unreachable,
      0
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // A non-JSON body means a proxy or PHP fatal got in the way; the status
    // code is the only trustworthy thing left.
    if (!response.ok) throw new ApiError(t.errors.unexpected(response.status), response.status);
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? t.errors.requestFailed(response.status),
      response.status,
      payload?.errors
    );
  }

  return payload as T;
}
