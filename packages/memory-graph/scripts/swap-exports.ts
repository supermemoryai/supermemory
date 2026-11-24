/**
 * Swaps package.json exports between source (for workspace/monorepo use)
 * and dist (for npm publishing).
 *
 * Usage:
 *   bun run scripts/swap-exports.ts pack    # switch to dist exports
 *   bun run scripts/swap-exports.ts unpack  # switch back to source exports
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const pkgPath = join(import.meta.dirname, "..", "package.json")
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))

const mode = process.argv[2]

if (mode === "pack") {
	// Switch to dist exports for npm publishing
	pkg.main = "./dist/memory-graph.cjs"
	pkg.module = "./dist/memory-graph.js"
	pkg.types = "./dist/index.d.ts"
	pkg.exports = {
		".": {
			types: "./dist/index.d.ts",
			import: "./dist/memory-graph.js",
			require: "./dist/memory-graph.cjs",
		},
		"./mock-data": {
			types: "./dist/mock-data.d.ts",
			import: "./dist/mock-data.js",
		},
		"./server": {
			types: "./dist/server.d.ts",
			import: "./dist/server.js",
			require: "./dist/server.cjs",
		},
		"./package.json": "./package.json",
	}
	pkg.typesVersions = { "*": { server: ["./dist/server.d.ts"] } }
} else if (mode === "unpack") {
	// Switch back to source exports for workspace use
	pkg.main = "./src/index.tsx"
	pkg.module = "./src/index.tsx"
	pkg.types = "./src/index.tsx"
	pkg.exports = {
		".": "./src/index.tsx",
		"./mock-data": "./src/mock-data.ts",
		"./server": "./src/server.ts",
		"./package.json": "./package.json",
	}
	delete pkg.typesVersions
} else {
	console.error("Usage: bun run scripts/swap-exports.ts [pack|unpack]")
	process.exit(1)
}

writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
console.log(`Exports swapped to ${mode === "pack" ? "dist" : "source"} mode`)
