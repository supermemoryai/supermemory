// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
	_experiments: {
		enableLogs: true,
	},

	enabled: process.env.NODE_ENV === "production",

	// Setting this option to true will print useful information to the console while you're setting up Sentry.
	debug: false,
	dsn: "https://a12ac22517d938dc69f9c5ad67bf8e2d@o4508385422802944.ingest.us.sentry.io/4509454536998913",

	integrations: [Sentry.consoleLoggingIntegration()],

	// Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
	tracesSampleRate: 1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
