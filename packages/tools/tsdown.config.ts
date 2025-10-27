import { defineConfig } from "tsdown"

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/ai-sdk.ts",
		"src/claude-memory.ts",
		"src/openai/index.ts",
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
	exports: true,
})
