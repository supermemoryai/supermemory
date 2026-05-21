import esbuild from "esbuild"
import { readFileSync } from "fs"

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"))
const isProduction = process.argv[2] === "production"

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: ["obsidian", "electron", "@codemirror/view", "@codemirror/state"],
	format: "cjs",
	target: "es2020",
	outfile: "main.js",
	sourcemap: isProduction ? false : "inline",
	define: {
		"process.env.PLUGIN_VERSION": JSON.stringify(manifest.version),
	},
	logLevel: "info",
})

if (isProduction) {
	await context.rebuild()
	await context.dispose()
} else {
	await context.watch()
}
