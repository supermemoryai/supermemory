import { describe, expect, it } from "bun:test"
import path from "node:path"
import { getPythonExecutable } from "./run"

describe("getPythonExecutable", () => {
	const baseDir = path.join("repo", "packages", "docs-test")

	it("uses the Windows virtual environment layout", () => {
		expect(getPythonExecutable("win32", baseDir)).toBe(
			path.join(baseDir, ".venv", "Scripts", "python.exe"),
		)
	})

	it("uses the Unix virtual environment layout on Linux and macOS", () => {
		for (const platform of ["linux", "darwin"] as const) {
			expect(getPythonExecutable(platform, baseDir)).toBe(
				path.join(baseDir, ".venv", "bin", "python3"),
			)
		}
	})
})
