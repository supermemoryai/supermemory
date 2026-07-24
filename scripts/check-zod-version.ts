import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const result = Bun.spawnSync(["bun", "pm", "ls", "--all"], {
	cwd: root,
	stdout: "pipe",
	stderr: "inherit",
})

if (result.exitCode !== 0) {
	throw new Error(`bun pm ls failed with exit code ${result.exitCode}`)
}

const versions = new Set(
	Array.from(
		result.stdout.toString().matchAll(/(?:^|[\s│├└─])zod@(\d+\.\d+\.\d+)\b/gm),
		(match) => match[1],
	),
)

function addBunLockVersions(path: string): void {
	const lock = readFileSync(resolve(root, path), "utf8")
	for (const match of lock.matchAll(/"zod@(\d+\.\d+\.\d+)"/g)) {
		if (match[1]) versions.add(match[1])
	}
}

function addPnpmLockVersions(path: string): void {
	const lock = readFileSync(resolve(root, path), "utf8")
	for (const match of lock.matchAll(/^ {2}zod@(\d+\.\d+\.\d+):/gm)) {
		if (match[1]) versions.add(match[1])
	}
}

function addPackageLockVersions(path: string): void {
	const lock = JSON.parse(readFileSync(resolve(root, path), "utf8")) as {
		packages?: Record<string, { version?: string }>
	}
	for (const [packagePath, metadata] of Object.entries(lock.packages ?? {})) {
		if (
			(packagePath === "node_modules/zod" ||
				packagePath.endsWith("/node_modules/zod")) &&
			metadata.version
		) {
			versions.add(metadata.version)
		}
	}
}

addBunLockVersions("bun.lock")
addBunLockVersions("packages/tools/test/chatapp/bun.lock")
addPnpmLockVersions("apps/mcp/pnpm-lock.yaml")
addPackageLockVersions("apps/raycast-extension/package-lock.json")

if (versions.size !== 1) {
	throw new Error(
		`Expected one Zod version across dependency graph and lockfiles, found: ${
			versions.size === 0 ? "none" : [...versions].sort().join(", ")
		}`,
	)
}

const [version] = versions
if (!version?.startsWith("4.")) {
	throw new Error(`Expected Zod v4, found ${version ?? "none"}`)
}

console.log(`Single Zod resolution: ${version}`)
