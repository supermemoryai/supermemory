import MillionLint from "@million/lint";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const baseNextConfig = {
	transpilePackages: ["@repo/ui"],
	reactStrictMode: false,
	env: {
		TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
	},
};

let selectedCofig = baseNextConfig;

if (process.env.NODE_ENV === "development") {
	selectedCofig = MillionLint.next({
		rsc: true,
	})(baseNextConfig);
}

export default selectedCofig;

//! Disabled sentry for now because of unreasonably large bundle size
// export default withSentryConfig(selectedCofig, {
// 	// For all available options, see:
// 	// https://github.com/getsentry/sentry-webpack-plugin#options

// 	org: "none-h00",
// 	project: "javascript-nextjs",
// 	// Only print logs for uploading source maps in CI
// 	silent: !process.env.CI,

// 	// For all available options, see:
// 	// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

// 	// Upload a larger set of source maps for prettier stack traces (increases build time)
// 	widenClientFileUpload: true,

// 	// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
// 	// This can increase your server load as well as your hosting bill.
// 	// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
// 	// side errors will fail.
// 	tunnelRoute: "/monitoring",

// 	// Hides source maps from generated client bundles
// 	hideSourceMaps: true,

// 	// Automatically tree-shake Sentry logger statements to reduce bundle size
// 	disableLogger: true,

// 	// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
// 	// See the following for more information:
// 	// https://docs.sentry.io/product/crons/
// 	// https://vercel.com/docs/cron-jobs
// 	automaticVercelMonitors: true,
// });

// we only need to use the utility during development so we can check NODE_ENV
// (note: this check is recommended but completely optional)
if (process.env.NODE_ENV === "development") {
	// `await`ing the call is not necessary but it helps making sure that the setup has succeeded.
	//  If you cannot use top level awaits you could use the following to avoid an unhandled rejection:
	//  `setupDevPlatform().catch(e => console.error(e));`
	await setupDevPlatform();
}
