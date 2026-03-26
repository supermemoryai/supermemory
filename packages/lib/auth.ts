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

function normalizeBackendBaseURL(rawBaseURL: string): string {
	// Accept either "https://api.supermemory.ai" or "https://api.supermemory.ai/v3".
	// Auth endpoints are mounted at the root base (not under /v3).
	const trimmed = rawBaseURL.replace(/\/+$/, "")
	return trimmed.endsWith("/v3") ? trimmed.slice(0, -3) : trimmed
}

const backendBaseURL =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

export const authClient = createAuthClient({
	baseURL: normalizeBackendBaseURL(backendBaseURL),
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
