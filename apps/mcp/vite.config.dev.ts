import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// DEV config: full HMR loop, deps from node_modules. Use with `bun run dev:widget`
// to iterate on the widget without rebuilding the Worker. Run the Worker via
// `bun run dev` separately when testing the full server↔widget flow.
export default defineConfig({
	plugins: [tailwindcss(), react()],
	root: resolve(__dirname, "src/widget"),
	// Force a single react/react-dom copy. @supermemory/memory-graph (and its
	// dep optimization) can otherwise pull react-dom through a different
	// resolution path than the app's react, tripping react-dom's
	// "Incompatible React versions" identity check. Prod doesn't need this —
	// it externalizes both to one esm.sh URL.
	resolve: {
		dedupe: ["react", "react-dom"],
	},
	optimizeDeps: {
		include: ["react", "react-dom", "react-dom/client"],
	},
	server: {
		port: 5173,
	},
})
