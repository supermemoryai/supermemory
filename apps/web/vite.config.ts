import {
	vitePlugin as remix,
	cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from "@remix-run/dev";

import adapter from "@hono/vite-dev-server/cloudflare";
import serverAdapter from "hono-remix-adapter/vite";
import path from "path";
import { flatRoutes } from "remix-flat-routes";
import { UserConfig, defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const _plugins = [
	remixCloudflareDevProxy({
		persist: true,
	}),
	remix({
		future: {
			v3_fetcherPersist: true,
			v3_relativeSplatPath: true,
			v3_throwAbortReason: true,
			unstable_optimizeDeps: true,
		},
		ignoredRouteFiles: ["**/*"],
		routes: async (defineRoutes) => {
			return flatRoutes("routes", defineRoutes);
		},
	}),
	serverAdapter({
		adapter,
		entry: "server/index.ts",
	}),
	tsconfigPaths(),
];
// _plugins.unshift(MillionLint.vite());

export default defineConfig((mode) => {
	return {
		plugins: _plugins,
		resolve: {
			alias: {
				...(mode.mode === "development" && {
					postgres: path.resolve(__dirname, "../../node_modules/postgres/src/index.js"),
				}),
			},
			extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", ".css"],
		},
		ssr: {
			target: "node",
			noExternal:
				mode.mode === "development"
					? ["@udecode/plate-math", "katex", "prismjs", "react-tweet", "drizzle-orm"]
					: ["@udecode/plate-math", "katex", "prismjs"],
		},
		css: {
			modules: {
				scopeBehaviour: "local",
				generateScopedName: "[name]__[local]___[hash:base64:5]",
				localsConvention: "camelCaseOnly",
			},
		},
		build: {
			rollupOptions: {
				onwarn(warning, warn) {
					if (warning.code === "UNUSED_EXTERNAL_IMPORT") return;
					if (warning.code === "IGNORED_BARE_IMPORT") return;
					warn(warning);
				},
				onLog(level, log, handler) {
					// @ts-expect-error
					if (log.cause?.message?.includes("Can't resolve original location of error.")) return;
					handler(level, log);
				},
			},
		},
		optimizeDeps: {
			include: ["react-tweet"],
		},
	} satisfies UserConfig;
});
