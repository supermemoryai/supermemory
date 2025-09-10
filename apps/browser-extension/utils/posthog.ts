import { PostHog } from "posthog-js/dist/module.no-external"
import { STORAGE_KEYS } from "./constants"

export async function identifyUser(posthog: PostHog): Promise<void> {
	const stored = await chrome.storage.local.get([STORAGE_KEYS.USER_DATA])
	const userData = stored[STORAGE_KEYS.USER_DATA]

	if (userData?.userId) {
		posthog.identify(userData.userId, {
			email: userData.email,
			name: userData.name,
			userId: userData.userId,
		})
	}
}

let posthogInstance: PostHog | null = null
let initializationPromise: Promise<PostHog> | null = null

export const POSTHOG_CONFIG = {
	api_host: "https://api.supermemory.ai/orange",
	person_profiles: "identified_only",
	disable_external_dependency_loading: true,
	persistence: "localStorage",
	capture_pageview: false,
	autocapture: false,
} as const

export async function getPostHogInstance(): Promise<PostHog> {
	if (posthogInstance) {
		return posthogInstance
	}

	if (initializationPromise) {
		return initializationPromise
	}

	initializationPromise = initializePostHog()
	return initializationPromise
}

async function initializePostHog(): Promise<PostHog> {
	try {
		const posthog = new PostHog()

		if (!import.meta.env.WXT_POSTHOG_API_KEY) {
			console.error("PostHog API key not configured")
			throw new Error("PostHog API key not configured")
		}

		posthog.init(import.meta.env.WXT_POSTHOG_API_KEY || "", POSTHOG_CONFIG)

		await identifyUser(posthog)

		posthogInstance = posthog
		return posthog
	} catch (error) {
		console.error("Failed to initialize PostHog:", error)
		initializationPromise = null
		throw error
	}
}

export async function trackEvent(
	eventName: string,
	properties?: Record<string, unknown>,
): Promise<void> {
	try {
		const posthog = await getPostHogInstance()
		posthog.capture(eventName, properties)
	} catch (error) {
		console.error(`Failed to track event ${eventName}:`, error)
	}
}
