import { describe, expect, it } from "bun:test"
import path from "node:path"

const asyncEntrypoints = [
	"tests/typescript/quickstart.ts",
	"tests/typescript/sdk.ts",
	"tests/typescript/search.ts",
	"tests/typescript/user-profiles.ts",
	"tests/integrations/ai-sdk.ts",
	"tests/integrations/claude-memory.ts",
	"tests/integrations/openai-sdk.ts",
]

describe("TypeScript docs test entrypoints", () => {
	it("exits unsuccessfully when an async test rejects", async () => {
		const child = Bun.spawn(
			[
				process.execPath,
				"run",
				path.join(import.meta.dir, "tests/typescript/quickstart.ts"),
			],
			{
				cwd: import.meta.dir,
				env: {
					...Bun.env,
					SUPERMEMORY_API_KEY: "offline-test-key",
					SUPERMEMORY_BASE_URL: "http://127.0.0.1:65536",
				},
				stdout: "ignore",
				stderr: "pipe",
			},
		)

		const [exitCode, stderr] = await Promise.all([
			child.exited,
			new Response(child.stderr).text(),
		])

		expect(exitCode).toBe(1)
		expect(stderr).toContain("ERR_INVALID_URL")
	})

	it("marks every registered async entrypoint failure as unsuccessful", async () => {
		for (const relativePath of asyncEntrypoints) {
			const source = await Bun.file(
				path.join(import.meta.dir, relativePath),
			).text()

			expect(source).not.toContain("main().catch(console.error)")
			expect(source).toContain("process.exitCode = 1")
		}
	})
})
