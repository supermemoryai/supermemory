/**
 * Utilities for detecting and handling retryable Cloudflare Durable Object errors.
 *
 * Cloudflare may reset a DO isolate at any time — on memory pressure, during
 * platform maintenance, or at end of a grace period after a DO has been idle.
 * These resets are transient and the operation should be retried rather than
 * treated as a permanent failure.
 */

/**
 * Shape of errors that Cloudflare enriches with DO-specific metadata.
 * The `durableObjectReset` flag is set when the worker RPC stub detects
 * the remote isolate was reset mid-call.
 */
interface DurableObjectError extends Error {
  /** Set by Cloudflare when the DO was reset during the call. */
  durableObjectReset?: boolean;
  /** Set by Cloudflare when the DO is overloaded / rate-limited. */
  overloaded?: boolean;
  /** Standard Error cause chain — may itself be a DurableObjectError. */
  cause?: unknown;
}

/**
 * Returns `true` when `error` is a transient Cloudflare Durable Object error
 * that is safe to retry.
 *
 * Matches two classes of signal:
 *
 * 1. **Overload / capacity errors** — the DO is alive but overwhelmed.
 *    These were the original set of retryable conditions.
 *
 * 2. **Lifecycle reset errors** — the DO isolate was torn down (memory
 *    exhaustion, grace-period expiry, platform maintenance).  These are
 *    the new conditions added to fix SUPERMEMORY-BACKEND-JMN.
 */
export function isRetryableDurableObjectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const err = error as DurableObjectError;
  const msg = err.message ?? "";

  // ── Existing: overload / capacity signals ──────────────────────────────
  if (msg.includes("memory limit")) return true;
  if (msg.includes("overloaded")) return true;
  if (msg.includes("internal error; reference =")) return true;
  if (msg.includes("Durable Object")) return true;
  if (err.overloaded === true) return true;

  // ── New: DO lifecycle reset signals (fixes SUPERMEMORY-BACKEND-JMN) ───
  //
  // Cloudflare sets `durableObjectReset: true` on the stub error when the
  // remote isolate was torn down during the call.
  if (err.durableObjectReset === true) return true;

  // "Aborting engine: Grace period complete" — the DO's grace period elapsed
  // after the isolate became idle.  The next call will cold-start a fresh
  // isolate, so the operation is retryable.
  if (msg.includes("Grace period complete")) return true;

  // "Durable Object reset because it exceeded its memory limit" and similar
  // messages that contain "destroyed" indicate the isolate was forcibly torn
  // down.
  if (msg.includes("destroyed")) return true;

  // "Network connection lost" — the RPC connection to the DO was dropped
  // during an isolate reset or a platform-level connection migration.
  if (msg.includes("Network connection lost")) return true;

  // ── Check the nested cause chain ───────────────────────────────────────
  //
  // Cloudflare sometimes wraps the raw DO error in a higher-level error.
  // Walk one level of the cause chain to catch that pattern.
  const cause = err.cause;
  if (cause != null && typeof cause === "object") {
    const causeErr = cause as DurableObjectError;

    if (causeErr.durableObjectReset === true) return true;

    const causeMsg = (causeErr as Error).message ?? "";
    if (causeMsg.includes("Grace period complete")) return true;
    if (causeMsg.includes("destroyed")) return true;
    if (causeMsg.includes("Network connection lost")) return true;
  }

  return false;
}

/**
 * A typed tag for errors that have been identified as retryable DO lifecycle
 * reset errors.  Used by the ConnectorsWorkflow retry predicate.
 */
export class DurableObjectResetError extends Error {
  readonly _tag = "DurableObjectResetError" as const;

  constructor(
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "DurableObjectResetError";
  }
}

/**
 * Lifts a raw unknown defect into a `DurableObjectResetError` when the defect
 * matches the retryable DO lifecycle patterns, or re-throws it otherwise.
 *
 * Intended to be used inside `Effect.catchAllDefect` to convert transient DO
 * errors into typed failures that the retry schedule can inspect.
 */
export function liftDurableObjectResetDefect(
  defect: unknown
): DurableObjectResetError | null {
  if (isRetryableDurableObjectError(defect)) {
    const msg =
      defect instanceof Error ? defect.message : String(defect);
    return new DurableObjectResetError(msg, { cause: defect });
  }
  return null;
}
