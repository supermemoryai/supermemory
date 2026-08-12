import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		include: ["e2e/**/*.test.ts", "src/**/*.test.ts"],
		fileParallelism: false,
		testTimeout: 90_000,
		hookTimeout: 30_000,
	},
})
