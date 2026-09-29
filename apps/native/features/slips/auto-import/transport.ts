import type { AppRouterClient } from "@moojot/api/features/index";
import type { AutoImportInput } from "@moojot/api/features/import/import.schema";
import { createORPCClient, ORPCError, type InferClientOutputs } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { SimpleCsrfProtectionLinkPlugin } from "@orpc/client/plugins";

type AutoImportSlip = AppRouterClient["import"]["autoImportSlip"];
// The route validates input itself, so its client input type is `unknown`; use the shared request schema instead.
export type { AutoImportInput };
export type AutoImportOutcome = InferClientOutputs<AppRouterClient>["import"]["autoImportSlip"];

/**
 * RPC derives URLs from object keys, so `import.autoImportSlip` would become `/rpc/import/autoImportSlip`.
 * The server mounts the operation explicitly at POST /rpc/import/slip/auto-import, so the client uses those keys.
 */
type WireClient = { import: { slip: { "auto-import": AutoImportSlip } } };

/** Longer than the server's 140-second pre-write deadline so the server decides whether a write starts. */
export const AUTO_IMPORT_TIMEOUT_MS = 180_000;

export type AutoImportFailureKind = "response" | "network" | "timeout" | "cancelled";

/** Keeps the machine-readable parts of a failed request instead of a display message. */
export class AutoImportRequestError extends Error {
  readonly kind: AutoImportFailureKind;
  readonly code: string | null;
  readonly status: number | null;
  /** Seconds from a valid `Retry-After` response header. */
  readonly retryAfter: number | null;

  constructor(options: {
    kind: AutoImportFailureKind;
    code?: string | null;
    status?: number | null;
    retryAfter?: number | null;
    cause?: unknown;
  }) {
    super(options.code ?? options.kind, { cause: options.cause });
    this.name = "AutoImportRequestError";
    this.kind = options.kind;
    this.code = options.code ?? null;
    this.status = options.status ?? null;
    this.retryAfter = options.retryAfter ?? null;
  }
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
  const text = value?.trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number(text);
  const date = Date.parse(text);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - now) / 1000));
}

function isOutcome(value: unknown): value is AutoImportOutcome {
  if (!value || typeof value !== "object") return false;
  const outcome = value as Record<string, unknown>;
  if (outcome.status === "created") return typeof outcome.transactionId === "string" && !!outcome.transactionId;
  return (
    outcome.status === "skipped" &&
    (outcome.reason === "duplicate" || outcome.reason === "no_candidate" || outcome.reason === "incomplete_candidate")
  );
}

type ReceivedResponse = { status: number; retryAfter: string | null };

export type AutoImportTransport = (input: AutoImportInput, signal?: AbortSignal) => Promise<AutoImportOutcome>;

export function createAutoImportTransport(options: {
  baseUrl: string | (() => string);
  fetch?: (request: Request, init?: RequestInit) => Promise<Response>;
  /** Session headers, such as the Better Auth cookie that native clients forward manually. */
  headers?: () => Promise<Record<string, string>> | Record<string, string>;
  timeoutMs?: number;
}): AutoImportTransport {
  const send = options.fetch ?? ((request: Request, init?: RequestInit) => globalThis.fetch(request, init));
  return async (input, signal) => {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs ?? AUTO_IMPORT_TIMEOUT_MS);
    const cancel = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener("abort", cancel, { once: true });

    let response: ReceivedResponse | null = null;
    const link = new RPCLink({
      url: () => {
        const base = typeof options.baseUrl === "function" ? options.baseUrl() : options.baseUrl;
        return `${base.replace(/\/+$/, "")}/rpc`;
      },
      plugins: [new SimpleCsrfProtectionLinkPlugin()],
      headers: async () => (options.headers ? await options.headers() : {}),
      fetch: async (request, init) => {
        const result = await send(request, init);
        response = { status: result.status, retryAfter: result.headers.get("retry-after") };
        return result;
      },
    });
    const client = createORPCClient<WireClient>(link);

    try {
      const outcome: unknown = await client.import.slip["auto-import"](input, { signal: controller.signal });
      if (!isOutcome(outcome))
        throw new AutoImportRequestError({ kind: "response", code: "INVALID_RESPONSE", status: 200 });
      return outcome;
    } catch (cause) {
      if (cause instanceof AutoImportRequestError) throw cause;
      // Assigned inside the fetch callback, which control-flow narrowing cannot see.
      const received = response as ReceivedResponse | null;
      const retryAfter = parseRetryAfter(received?.retryAfter ?? null);
      if (cause instanceof ORPCError)
        throw new AutoImportRequestError({
          kind: "response",
          code: cause.code,
          status: received?.status ?? cause.status,
          retryAfter,
          cause,
        });
      if (timedOut) throw new AutoImportRequestError({ kind: "timeout", cause });
      if (signal?.aborted) throw new AutoImportRequestError({ kind: "cancelled", cause });
      if (received)
        throw new AutoImportRequestError({
          kind: "response",
          code: received.status < 400 ? "INVALID_RESPONSE" : null,
          status: received.status,
          retryAfter,
          cause,
        });
      throw new AutoImportRequestError({ kind: "network", cause });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    }
  };
}
