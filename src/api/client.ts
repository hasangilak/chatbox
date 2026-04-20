import { YAP_BASE_URL, YAP_TOKEN } from "../env";
import type { BusEvent } from "./events";

export interface ApiErrorShape {
  status: number;
  message: string;
  body: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = "ApiError";
    this.status = shape.status;
    this.body = shape.body;
  }
}

function authHeaders(): Record<string, string> {
  return YAP_TOKEN ? { Authorization: `Bearer ${YAP_TOKEN}` } : {};
}

function makeIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

function buildUrl(path: string, query: RequestOptions["query"]): string {
  const url = new URL(YAP_BASE_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

async function request<T>(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...authHeaders(),
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET" && method !== "HEAD") {
    headers["Idempotency-Key"] = opts.idempotencyKey ?? makeIdempotencyKey();
  }

  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const parsed: unknown = text ? safeJson(text) : undefined;

  if (!res.ok) {
    throw new ApiError({
      status: res.status,
      message:
        (typeof parsed === "object" && parsed && "error" in parsed
          ? String((parsed as { error: unknown }).error)
          : null) ||
        (typeof parsed === "object" && parsed && "message" in parsed
          ? String((parsed as { message: unknown }).message)
          : null) ||
        `${method} ${path} failed with ${res.status}`,
      body: parsed,
    });
  }

  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get<T>(path: string, opts?: RequestOptions): Promise<T> {
    return request<T>("GET", path, opts);
  },
  post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return request<T>("POST", path, { ...opts, body });
  },
  put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return request<T>("PUT", path, { ...opts, body });
  },
  patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return request<T>("PATCH", path, { ...opts, body });
  },
  delete<T>(path: string, opts?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, opts);
  },
};

/**
 * Subscribe to a conversation's SSE event stream using fetch streaming,
 * so auth headers work even when `YAP_API_TOKEN` is set.
 *
 * The returned function aborts the underlying request.
 */
export function subscribeStream(
  conversationId: string,
  sinceEventId: string | null,
  onEvent: (event: BusEvent) => void,
  onError?: (err: unknown) => void,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const url = buildUrl(`/conversations/${conversationId}/stream`, {
        since_event: sinceEventId ?? undefined,
      });
      const res = await fetch(url, {
        headers: { Accept: "text/event-stream", ...authHeaders() },
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new ApiError({
          status: res.status,
          message: `stream ${conversationId} failed with ${res.status}`,
          body: await res.text().catch(() => ""),
        });
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let boundary = buf.indexOf("\n\n");
        while (boundary !== -1) {
          const frame = buf.slice(0, boundary);
          buf = buf.slice(boundary + 2);
          const dataLine = frame
            .split("\n")
            .find((l) => l.startsWith("data:"));
          if (dataLine) {
            try {
              const json = JSON.parse(dataLine.slice(5).trim());
              onEvent(json as BusEvent);
            } catch {
              // ignore unparseable frames (keep-alive comments etc.)
            }
          }
          boundary = buf.indexOf("\n\n");
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      onError?.(err);
    }
  })();

  return () => controller.abort();
}
