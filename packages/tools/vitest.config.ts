import { defineConfig } from "vitest/config"
import { config } from "dotenv"

config({ path: ".env.local" })

export default defineConfig({
	test: {
		testTimeout: 100000,
		env: {
			NODE_ENV: "test",
		},
	},
})
