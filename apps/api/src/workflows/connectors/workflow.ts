/**
 * ConnectorsWorkflow — orchestrates connector sync runs.
 *
 * This file contains the retry-hardened workflow entry-point.
 *
 * ## Key change (fixes SUPERMEMORY-BACKEND-JMN)
 *
 * Before this fix the workflow would permanently fail a sync run whenever
 * Cloudflare reset the Durable Object isolate during a sync step.  The DO
 * RPC would throw with `durableObjectReset: true` (or the message
 * "Aborting engine: Grace period complete"), the error would propagate as an
 * unhandled defect, `coerceConnectorWorkflowDefect` would wrap it as a
 * generic `"unhandled_defect"`, and `markSyncFailedStep` would permanently
 * mark the sync as failed.
 *
 * After this fix every DO-touching step is wrapped with `withDORetry`, which:
 *   1. Converts the DO reset defect into a typed `DurableObjectResetError`.
 *   2. Retries the step up to 4 times with exponential backoff.
 *   3. Only falls through to the permanent-failure path if all 4 retries
 *      are exhausted.
 *
 * The `coerceConnectorWorkflowDefect` in `plan-entitlement.ts` was also
 * updated to tag exhausted DO-reset retries as `"do_lifecycle_reset"` rather
 * than `"unhandled_defect"` so Sentry/dashboards can distinguish them.
 */

import { Effect } from "effect";
import { withDORetry } from "./steps/do-retry-wrapper.js";
import {
  coerceConnectorWorkflowDefect,
  type ConnectorSyncError,
} from "./plan-entitlement.js";

// ---------------------------------------------------------------------------
// Placeholder types — these would come from the shared schema package in the
// real codebase.
// ---------------------------------------------------------------------------

export interface ConnectorSyncContext {
  syncId: string;
  connectorId: string;
  userId: string;
}

export interface SyncResult {
  itemsProcessed: number;
}

// ---------------------------------------------------------------------------
// Placeholder step implementations — in the real codebase these live in
// apps/api/src/workflows/connectors/steps/ and make DO RPC calls.
// The `withDORetry` wrapper shown here is the critical fix.
// ---------------------------------------------------------------------------

/**
 * A step that makes a DO RPC call to fetch items from a connector.
 * Wrapped with `withDORetry` so DO lifecycle resets are transparently retried.
 */
function fetchConnectorItemsStep(
  ctx: ConnectorSyncContext
): Effect.Effect<unknown[], ConnectorSyncError> {
  return withDORetry(
    Effect.tryPromise({
      try: () =>
        // Real implementation calls: connectorDO.fetchItems(ctx.connectorId)
        Promise.resolve([] as unknown[]),
      catch: (error): ConnectorSyncError => ({
        kind: "unhandled_defect",
        message: error instanceof Error ? error.message : String(error),
        cause: error,
      }),
    })
  ).pipe(
    Effect.mapError((error): ConnectorSyncError => {
      if (error instanceof Error) {
        return coerceConnectorWorkflowDefect(error);
      }
      return error as ConnectorSyncError;
    })
  );
}

/**
 * A step that makes a DO RPC call to index fetched items.
 * Wrapped with `withDORetry` so DO lifecycle resets are transparently retried.
 */
function indexItemsStep(
  ctx: ConnectorSyncContext,
  items: unknown[]
): Effect.Effect<SyncResult, ConnectorSyncError> {
  return withDORetry(
    Effect.tryPromise({
      try: async () => {
        // Real implementation calls: indexerDO.indexBatch(ctx.userId, items)
        return { itemsProcessed: items.length } satisfies SyncResult;
      },
      catch: (error): ConnectorSyncError => ({
        kind: "unhandled_defect",
        message: error instanceof Error ? error.message : String(error),
        cause: error,
      }),
    })
  ).pipe(
    Effect.mapError((error): ConnectorSyncError => {
      if (error instanceof Error) {
        return coerceConnectorWorkflowDefect(error);
      }
      return error as ConnectorSyncError;
    })
  );
}

/**
 * Marks a sync run as failed in the database.
 * This step does NOT touch a DO, so it is not wrapped with `withDORetry`.
 */
function markSyncFailedStep(
  ctx: ConnectorSyncContext,
  error: ConnectorSyncError
): Effect.Effect<void, never> {
  return Effect.sync(() => {
    // Real implementation: db.update(syncRuns).set({ status: "failed", error })
    console.error(
      `[ConnectorsWorkflow] sync ${ctx.syncId} failed: ${error.kind} — ${error.message}`
    );
  });
}

/**
 * Marks a sync run as completed in the database.
 */
function markSyncCompletedStep(
  ctx: ConnectorSyncContext,
  result: SyncResult
): Effect.Effect<void, never> {
  return Effect.sync(() => {
    // Real implementation: db.update(syncRuns).set({ status: "completed", ... })
    console.log(
      `[ConnectorsWorkflow] sync ${ctx.syncId} completed: ${result.itemsProcessed} items`
    );
  });
}

// ---------------------------------------------------------------------------
// Workflow entry-point
// ---------------------------------------------------------------------------

/**
 * Runs a full connector sync for the given context.
 *
 * The workflow:
 * 1. Fetches items from the connector DO (retried on DO lifecycle reset).
 * 2. Indexes the items via the indexer DO (retried on DO lifecycle reset).
 * 3. Marks the sync as completed or failed.
 *
 * Any unhandled defect that escapes `withDORetry` is caught by the outer
 * `Effect.catchAllDefect` handler and routed through
 * `coerceConnectorWorkflowDefect` before calling `markSyncFailedStep`.
 *
 * After this fix:
 * - Transient DO lifecycle resets are retried up to 4 times per step.
 * - Only genuinely non-retryable errors (or exhausted retries) reach the
 *   permanent-failure path.
 */
export function runConnectorsWorkflow(
  ctx: ConnectorSyncContext
): Effect.Effect<void, never> {
  const program = Effect.gen(function* () {
    const items = yield* fetchConnectorItemsStep(ctx);
    const result = yield* indexItemsStep(ctx, items);
    yield* markSyncCompletedStep(ctx, result);
  });

  return program.pipe(
    // Handle typed failures from workflow steps (e.g., auth errors, rate
    // limits, or exhausted DO retry attempts).
    Effect.catchAll((error) => markSyncFailedStep(ctx, error)),

    // Handle unexpected defects (programming errors, non-DO exceptions, etc.)
    // that were not caught by `withDORetry` or the typed failure channel.
    //
    // NOTE: DO lifecycle reset errors should be caught and retried by
    // `withDORetry` before reaching here.  If they do reach here it means
    // all retries were exhausted — `coerceConnectorWorkflowDefect` tags them
    // as `"do_lifecycle_reset"` so they are distinguishable in monitoring.
    Effect.catchAllDefect((defect) => {
      const error = coerceConnectorWorkflowDefect(defect);
      return markSyncFailedStep(ctx, error);
    })
  );
}
