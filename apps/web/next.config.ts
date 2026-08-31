import { withSentryConfig } from "@sentry/nextjs"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	typescript: {
		ignoreBuildErrors: true,
	},
	transpilePackages: [
		"@supermemory/memory-graph",
		"@tiptap/core",
		"@tiptap/react",
		"@tiptap/pm",
		"@tiptap/starter-kit",
		"@tiptap/extension-placeholder",
		"@tiptap/extension-link",
		"@tiptap/extension-image",
		"@tiptap/extension-task-list",
		"@tiptap/extension-task-item",
		"@tiptap/suggestion",
		"@tiptap/markdown",
	],
	experimental: {
		viewTransition: true,
		turbopackFileSystemCacheForDev: true,
	},
	poweredByHeader: false,
	async rewrites() {
		return [
			{
				source: "/ingest/static/:path*",
				destination: "https://us-assets.i.posthog.com/static/:path*",
			},
			{
				source: "/ingest/:path*",
				destination: "https://us.i.posthog.com/:path*",
			},
		]
	},
	skipTrailingSlashRedirect: true,
	async headers() {
		// app.supermemory.ai is being deprecated in favour of the console.
		// Anything that still serves HTML must not be framable, matching the
		// console's clickjacking protection.
		return [
			{
				source: "/:path*",
				headers: [
					{ key: "X-Frame-Options", value: "DENY" },
					{
						key: "Content-Security-Policy",
						value: "frame-ancestors 'none'",
					},
				],
			},
		]
	},
	async redirects() {
		return [
			// The old app surface is dying: send its entry points to the console.
			{
				source: "/",
				destination: "https://console.supermemory.ai",
				permanent: false,
			},
			{
				source: "/login",
				destination: "https://console.supermemory.ai",
				permanent: false,
			},
			{
				source: "/login/:path*",
				destination: "https://console.supermemory.ai",
				permanent: false,
			},
			{
				source: "/new",
				destination: "/",
				permanent: true,
			},
			{
				source: "/new/:path*",
				destination: "/:path*",
				permanent: true,
			},
		]
	},
}

export default withSentryConfig(nextConfig, {
	// For all available options, see:
	// https://www.npmjs.com/package/@sentry/webpack-plugin#options

	org: "supermemory",

	project: "consumer-app",

	// Only print logs for uploading source maps in CI
	silent: !process.env.CI,

	// For all available options, see:
	// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

	// Upload a larger set of source maps for prettier stack traces (increases build time)
	widenClientFileUpload: true,

	// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
	// This can increase your server load as well as your hosting bill.
	// Note: Check that the configured route will not match with your Next.js middleware(proxy), otherwise reporting of client-
	// side errors will fail.
	tunnelRoute: "/monitoring",

	// Automatically tree-shake Sentry logger statements to reduce bundle size
	disableLogger: true,

	// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
	// See the following for more information:
	// https://docs.sentry.io/product/crons/
	// https://vercel.com/docs/cron-jobs
	automaticVercelMonitors: true,
})

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

initOpenNextCloudflareForDev()
