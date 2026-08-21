import { defineConfig } from "tsdown"

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/ai-sdk.ts",
		"src/claude-memory.ts",
		"src/openai/index.ts",
		"src/mastra.ts",
		"src/voltagent/index.ts",
	],
	format: "esm",
	sourcemap: false,
	target: "es2020",
	tsconfig: "./tsconfig.json",
	clean: true,
	minify: true,
	dts: {
		sourcemap: false,
	},
	// exports are hand-maintained in package.json: tsdown's generator emits
	// native path separators, producing broken "./openai\\index" on Windows.
	exports: false,
	unbundle: true,
})
