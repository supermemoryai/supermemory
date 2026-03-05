import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
	plugins: [viteSingleFile()],
	build: {
		outDir: "dist",
		emptyOutDir: false,
		rollupOptions: {
			input: "mcp-app.html",
		},
	},
})
