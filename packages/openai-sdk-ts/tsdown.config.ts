import { defineConfig } from "tsdown"

export default defineConfig({
	entry: ["src/index.ts"],
	format: "esm",
	sourcemap: true,
	target: "es2020",
	tsconfig: "./tsconfig.json",
	clean: true,
	minify: true,
	dts: {
		sourcemap: true,
	},
	exports: true,
})
