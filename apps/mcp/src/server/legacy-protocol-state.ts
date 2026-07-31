import { DurableObject } from "cloudflare:workers"

// Kept for one rollout so the old protocol Durable Object class remains
// deployable and rollback-safe. No request path uses this class anymore.
export class SupermemoryMCP extends DurableObject {}
