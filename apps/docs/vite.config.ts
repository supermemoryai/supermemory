import { cloudflare } from "@cloudflare/vite-plugin"
import { holocron } from "@holocron.so/vite"
import { defineConfig } from "vite"

export default defineConfig({
	base: "/docs/",
	publicDir: ".holocron-public",
	plugins: [
		holocron({ entry: "./src/server.ts", externalizeShared: false }),
		cloudflare({
			viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
		}),
	],
})
