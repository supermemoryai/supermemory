import path from "node:path"
import { createRequire } from "node:module"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, type WxtViteConfig } from "wxt"

const require = createRequire(import.meta.url)

function reactPackageRoot(pkg: "react" | "react-dom"): string {
	return path.dirname(require.resolve(`${pkg}/package.json`))
}

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	vite: () =>
		({
			plugins: [tailwindcss()],
			resolve: {
				dedupe: ["react", "react-dom"],
				alias: {
					react: reactPackageRoot("react"),
					"react-dom": reactPackageRoot("react-dom"),
				},
			},
			optimizeDeps: {
				include: ["react", "react-dom", "@tanstack/react-query"],
			},
		}) as WxtViteConfig,
	manifest: {
		name: "supermemory",
		homepage_url: "https://supermemory.ai",
		version: "6.1.3",
		permissions: ["storage", "activeTab", "webRequest", "tabs"],
		host_permissions: [
			"*://x.com/*",
			"*://twitter.com/*",
			"*://supermemory.ai/*",
			"*://api.supermemory.ai/*",
			"*://chatgpt.com/*",
			"*://chat.openai.com/*",
			"https://*.posthog.com/*",
		],
		web_accessible_resources: [
			{
				resources: ["icon-16.png", "fonts/*.ttf"],
				matches: ["<all_urls>"],
			},
		],
	},
	webExt: {
		chromiumArgs: ["--user-data-dir=./.wxt/chrome-data"],
	},
})
