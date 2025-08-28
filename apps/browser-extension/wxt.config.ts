import { defineConfig } from "wxt"

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	manifest: {
		name: "supermemory",
		homepage_url: "https://supermemory.ai",
		permissions: [
			"contextMenus",
			"storage",
			"scripting",
			"activeTab",
			"webRequest",
			"tabs",
		],
		host_permissions: [
			"*://x.com/*",
			"*://twitter.com/*",
			"*://supermemory.ai/*",
			"*://api.supermemory.ai/*",
			"*://chatgpt.com/*",
			"*://chat.openai.com/*",
		],
		web_accessible_resources: [
			{
				resources: ["icon-16.png", "fonts/*.ttf"],
				matches: ["<all_urls>"],
			},
		],
	},
	webExt: {
		disabled: true,
	},
})
