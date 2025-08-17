import {
	adminClient,
	anonymousClient,
	apiKeyClient,
	emailOTPClient,
	magicLinkClient,
	organizationClient,
	usernameClient,
} from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai",
	fetchOptions: {
		credentials: "include",
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

export const signIn = authClient.signIn
export const signOut = authClient.signOut
export const useSession = authClient.useSession
export const getSession = authClient.getSession
