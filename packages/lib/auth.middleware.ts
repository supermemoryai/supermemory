import { createAuthClient } from "better-auth/client"
import {
	adminClient,
	anonymousClient,
	apiKeyClient,
	emailOTPClient,
	magicLinkClient,
	organizationClient,
	usernameClient,
} from "better-auth/client/plugins"

export const middlewareAuthClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai",
	fetchOptions: {
		throw: true,
	},
	plugins: [
		usernameClient(),
		magicLinkClient(),
		emailOTPClient(),
		apiKeyClient(),
		adminClient(),
		organizationClient(),
		anonymousClient(),
	],
})
