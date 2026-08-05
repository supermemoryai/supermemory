/**
 * @deprecated Use `@supermemory/tools/ai-sdk` instead. This package is now a
 * thin re-export of it and will not receive further changes.
 *
 * Behavior change in 2.0.0 (inherited from `@supermemory/tools`):
 * - Passing both `projectId` and `containerTags` now throws instead of silently
 *   ignoring `containerTags`.
 * - With no config, calls are scoped to `["sm_project_default"]` instead of being
 *   unscoped across every project.
 * - `limit`/`offset` are coerced, so a model emitting `"5"` is accepted.
 */
export * from "@supermemory/tools/ai-sdk"
