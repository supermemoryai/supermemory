import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

// PROD config: single-file HTML bundle for the MCP widget resource.
// React/React-DOM are externalized to esm.sh — keeps the bundle small and
// makes the host fetch them from a CDN. The widget resource declares
// `_meta.ui.csp.resourceDomains: ["https://esm.sh"]` so the host allows it.
// Tailwind 4 generates CSS at build time and is inlined by viteSingleFile.
export default defineConfig({
	plugins: [tailwindcss(), react(), viteSingleFile()],
	build: {
		outDir: "dist",
		emptyOutDir: false,
		rollupOptions: {
			input: "src/widget/index.html",
			external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
			output: {
				paths: {
					react: "https://esm.sh/react@19.2.4",
					"react-dom": "https://esm.sh/react-dom@19.2.4",
					"react-dom/client": "https://esm.sh/react-dom@19.2.4/client",
					"react/jsx-runtime": "https://esm.sh/react@19.2.4/jsx-runtime",
				},
			},
		},
	},
})
