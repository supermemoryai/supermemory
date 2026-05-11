import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
		// Deduplicate React so the local package and @testing-library/react
		// share a single React instance.  Without this vitest throws
		// "Invalid hook call" because react-dom internally resolves a different
		// React copy than the one the component was compiled against.
		dedupe: ["react", "react-dom"],
	},
	test: {
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		environment: "happy-dom",
		setupFiles: ["src/__tests__/setup.ts"],
		deps: {
			optimizer: {
				web: {
					include: ["react", "react-dom", "@testing-library/react"],
				},
			},
		},
	},
	build: {
		lib: {
			entry: {
				"memory-graph": resolve(__dirname, "src/index.tsx"),
				"mock-data": resolve(__dirname, "src/mock-data.ts"),
			},
			formats: ["es", "cjs"],
		},
		rollupOptions: {
			external: ["react", "react-dom", "react/jsx-runtime"],
			output: {
				globals: {
					react: "React",
					"react-dom": "ReactDOM",
				},
			},
		},
		sourcemap: true,
		minify: false,
	},
})
