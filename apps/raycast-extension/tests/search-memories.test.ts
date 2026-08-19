import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"

test("wires physical search input before selected text resolves", async () => {
	const fixturePath = fileURLToPath(
		new URL("./fixtures/search-memories-command.ts", import.meta.url),
	)
	const packageDirectory = fileURLToPath(new URL("..", import.meta.url))
	const child = Bun.spawn({
		cmd: [process.execPath, fixturePath],
		cwd: packageDirectory,
		stderr: "pipe",
		stdout: "pipe",
	})
	const [exitCode, stdout, stderr] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	])

	if (exitCode !== 0) {
		throw new Error(`Search command fixture failed:\n${stderr || stdout}`)
	}
	expect(stdout).toContain("search command wiring passed")
})
