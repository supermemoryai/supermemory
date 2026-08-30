// Test-only stub for cloudflare:workers so modules using DurableObject load
// under vitest. Only pure helpers are unit-tested; DO classes run in e2e.
export class DurableObject {
	ctx: unknown
	env: unknown
	constructor(ctx: unknown, env: unknown) {
		this.ctx = ctx
		this.env = env
	}
}