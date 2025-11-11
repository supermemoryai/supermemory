import tailwindcss from "@tailwindcss/vite"
import { defineConfig, type WxtViteConfig } from "wxt"

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	vite: () =>
		({
			plugins: [tailwindcss()],
		}) as WxtViteConfig,
	manifest: {
		name: "supermemory",
		homepage_url: "https://supermemory.ai",
		version: "6.0.104",
		permissions: ["contextMenus", "storage", "activeTab", "webRequest", "tabs"],
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
