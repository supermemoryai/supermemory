import { PostHog } from "posthog-js/dist/module.no-external"
import { userData } from "./storage"

export async function identifyUser(posthog: PostHog): Promise<void> {
	const storedUserData = await userData.getValue()

	if (storedUserData?.userId) {
		posthog.identify(storedUserData.userId, {
			email: storedUserData.email,
			name: storedUserData.name,
			userId: storedUserData.userId,
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
