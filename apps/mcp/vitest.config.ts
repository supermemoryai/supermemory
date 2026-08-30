import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
	resolve: {
		alias: {
			"cloudflare:workers": fileURLToPath(
				new URL("./src/server/__cloudflare-workers-stub.ts", import.meta.url),
			),
		},
	},
	test: {
		include: ["e2e/**/*.test.ts", "src/**/*.test.ts"],
		fileParallelism: false,
		testTimeout: 90_000,
		hookTimeout: 30_000,
	},
})
