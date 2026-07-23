/**
 * Plan entitlement helpers and defect coercion for the ConnectorsWorkflow.
 *
 * `coerceConnectorWorkflowDefect` is the single place that translates an
 * untyped `defect` (an unexpected exception that escaped the Effect channel)
 * into a typed `ConnectorSyncError` that the outer workflow can handle.
 *
 * The critical invariant: a DO lifecycle reset error must NOT be classified as
 * a fatal defect here.  It should have been retried before reaching this
 * handler (see workflow.ts).  If it does reach here (e.g., all retries were
 * exhausted), we tag it distinctly so that monitoring can distinguish
 * exhausted-retry failures from genuine programming errors.
 */

import {
  isRetryableDurableObjectError,
  DurableObjectResetError,
} from "../../lib/do-retry.js";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type ConnectorSyncErrorKind =
  | "do_lifecycle_reset"   // Transient DO reset — retries exhausted
  | "do_overload"          // DO capacity / overload error
  | "unhandled_defect"     // Any other unexpected exception
  | "plan_limit_exceeded"  // User exceeded their plan's connector quota
  | "auth_failure"         // Connector auth token expired / revoked
  | "rate_limited";        // External service rate limit

export interface ConnectorSyncError {
  readonly kind: ConnectorSyncErrorKind;
  readonly message: string;
  readonly cause?: unknown;
}

function makeError(
  kind: ConnectorSyncErrorKind,
  message: string,
  cause?: unknown
): ConnectorSyncError {
  return { kind, message, cause };
}

// ---------------------------------------------------------------------------
// Defect coercion
// ---------------------------------------------------------------------------

/**
 * Translates a raw defect (escaped exception) into a typed
 * `ConnectorSyncError` for downstream handling.
 *
 * Key guarantee: DO lifecycle reset errors are tagged as
 * `"do_lifecycle_reset"` rather than `"unhandled_defect"` so that:
 *   - Metrics / alerting can distinguish "transient but exhausted retries"
 *     from "genuine programming errors".
 *   - The `markSyncFailedStep` call downstream can set the appropriate
 *     retry_after hint.
 */
export function coerceConnectorWorkflowDefect(
  defect: unknown
): ConnectorSyncError {
  // ── DO lifecycle reset (new, fixes SUPERMEMORY-BACKEND-JMN) ───────────
  //
  // This path is reached only after withDORetry has exhausted all retries,
  // OR if the retry wrapper was not applied to the failing step.  Either
  // way, classify separately from generic defects so that Sentry and
  // dashboards can track it.
  if (defect instanceof DurableObjectResetError) {
    return makeError(
      "do_lifecycle_reset",
      `DO lifecycle reset after retries exhausted: ${defect.message}`,
      defect
    );
  }

  // Catch raw DO reset errors that were not wrapped by liftDurableObjectResetDefect.
  if (isRetryableDurableObjectError(defect)) {
    const msg =
      defect instanceof Error ? defect.message : String(defect);
    return makeError(
      "do_lifecycle_reset",
      `DO lifecycle reset (unretried): ${msg}`,
      defect
    );
  }

  // ── All other defects ──────────────────────────────────────────────────
  const msg = defect instanceof Error ? defect.message : String(defect);
  return makeError("unhandled_defect", msg, defect);
}
