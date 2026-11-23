/**
 * The only way the worker talks to the outside world.
 * Timeouts, retries with backoff and jitter, and a polite gap between requests to the same host.
 */
export interface HttpOptions {
  timeoutMs: number;
  retries: number;
  /** minimum time between two requests to the same host */
  gapMs: number;
}

export class HttpError extends Error {
  constructor(readonly url: string, readonly status: number | null, message: string) {
    super(message);
  }
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class HttpClient {
  readonly #lastRequest = new Map<string, number>();

  constructor(
    private readonly options: HttpOptions = { timeoutMs: 20_000, retries: 3, gapMs: 500 },
    private readonly headers: Record<string, string> = {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      accept: 'application/json, text/plain, */*',
      'accept-language': 'sv-SE,sv;q=0.9,en;q=0.8',
    },
  ) {}

  getJson<T>(url: string): Promise<T> {
    return this.#json<T>(url, { method: 'GET' });
  }

  postJson<T>(url: string, body: unknown): Promise<T> {
    return this.#json<T>(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
  }

  async #json<T>(url: string, init: RequestInit): Promise<T> {
    const { timeoutMs, retries } = this.options;
    let last: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await sleep(500 * 2 ** (attempt - 1) + Math.random() * 300);
      await this.#politeness(url);
      try {
        const res = await fetch(url, { ...init, headers: { ...this.headers, ...init.headers }, signal: AbortSignal.timeout(timeoutMs) });
        if (res.ok) return (await res.json()) as T;
        last = new HttpError(url, res.status, `${res.status} ${res.statusText}`);
        if (!RETRYABLE.has(res.status)) break;
      } catch (e) {
        last = e; // network error or timeout: retry
      }
    }
    throw last instanceof HttpError ? last : new HttpError(url, null, String(last));
  }

  async #politeness(url: string) {
    const host = new URL(url).host;
    const wait = (this.#lastRequest.get(host) ?? 0) + this.options.gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    this.#lastRequest.set(host, Date.now());
  }
}
