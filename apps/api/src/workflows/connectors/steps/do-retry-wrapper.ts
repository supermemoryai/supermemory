/**
 * DO retry helper for use in workflow steps.
 *
 * Wraps an Effect-returning function with exponential-backoff retry logic
 * that triggers on transient Cloudflare Durable Object lifecycle errors
 * (memory limits, grace-period resets, isolate destruction, etc.).
 *
 * Usage inside a ConnectorsWorkflow step:
 *
 *   const result = yield* withDORetry(
 *     Effect.tryPromise(() => myDoStub.someMethod(args))
 *   )
 *
 * Configuration mirrors the `mcpMountHandler` retry policy:
 *   - 4 retry attempts (5 total calls)
 *   - Exponential backoff starting at 100 ms, factor 2
 *   - Maximum backoff cap of 5 s
 *   - Only retries when `isRetryableDurableObjectError` returns true
 */

import { Effect, Schedule } from "effect";
import {
  isRetryableDurableObjectError,
  liftDurableObjectResetDefect,
  DurableObjectResetError,
} from "../../../lib/do-retry.js";

// ---------------------------------------------------------------------------
// Retry schedule
// ---------------------------------------------------------------------------

/**
 * Exponential backoff: 100 ms → 200 ms → 400 ms → 800 ms (capped at 5 s).
 * Composed with `recurs(4)` so we make at most 4 retry attempts (5 total).
 */
const doRetrySchedule: Schedule.Schedule<unknown> =
  Schedule.exponential("100 millis", 2).pipe(
    Schedule.intersect(Schedule.recurs(4)),
    Schedule.jittered
  );

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Wraps `effect` with retry logic for transient DO lifecycle errors.
 *
 * The wrapper:
 * 1. Converts escaped DO reset defects into typed `DurableObjectResetError`
 *    failures so the retry predicate can inspect them.
 * 2. Retries the effect up to 4 times on any DO lifecycle reset error.
 * 3. Re-raises the final failure if all retries are exhausted.
 *
 * DO NOT use this wrapper in HTTP-response paths (e.g. `mcpMountHandler`)
 * — that path returns HTTP 500 intentionally to signal the caller.
 * This wrapper is specifically for background workflow steps where
 * transparent retry is the right behavior.
 */
export function withDORetry<A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E | DurableObjectResetError, R> {
  return (
    // Step 1: Convert any DO reset defect into a typed failure so the retry
    // predicate below can match it.
    effect.pipe(
      Effect.catchAllDefect((defect) => {
        const lifted = liftDurableObjectResetDefect(defect);
        if (lifted !== null) {
          return Effect.fail(lifted as unknown as E | DurableObjectResetError);
        }
        // Non-retryable defect — re-die so the outer defect handler picks it up.
        return Effect.die(defect);
      }),
      // Step 2: Retry on any error that is a retryable DO error.
      Effect.retry({
        while: (error): boolean => {
          if (error instanceof DurableObjectResetError) return true;
          return isRetryableDurableObjectError(error);
        },
        schedule: doRetrySchedule,
      })
    )
  );
}
