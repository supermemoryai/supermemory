/**
 * Twitter Authentication Module
 * Handles token capture and storage for Twitter API access
 */
import { STORAGE_KEYS } from "./constants"

export interface TwitterAuthTokens {
	cookie: string
	csrf: string
	auth: string
}

/**
 * Captures Twitter authentication tokens from web request headers
 * @param details - Web request details containing headers
 * @returns True if tokens were captured, false otherwise
 */
export function captureTwitterTokens(
	details: chrome.webRequest.WebRequestDetails & {
		requestHeaders?: chrome.webRequest.HttpHeader[]
	},
): boolean {
	if (!(details.url.includes("x.com") || details.url.includes("twitter.com"))) {
		return false
	}

	const authHeader = details.requestHeaders?.find(
		(header) => header.name.toLowerCase() === "authorization",
	)
	const cookieHeader = details.requestHeaders?.find(
		(header) => header.name.toLowerCase() === "cookie",
	)
	const csrfHeader = details.requestHeaders?.find(
		(header) => header.name.toLowerCase() === "x-csrf-token",
	)

	if (authHeader?.value && cookieHeader?.value && csrfHeader?.value) {
		chrome.storage.session.get([STORAGE_KEYS.TOKENS_LOGGED], (result) => {
			if (!result[STORAGE_KEYS.TOKENS_LOGGED]) {
				console.log("Twitter auth tokens captured successfully")
				chrome.storage.session.set({ [STORAGE_KEYS.TOKENS_LOGGED]: true })
			}
		})

		chrome.storage.session.set({
			[STORAGE_KEYS.TWITTER_COOKIE]: cookieHeader.value,
			[STORAGE_KEYS.TWITTER_CSRF]: csrfHeader.value,
			[STORAGE_KEYS.TWITTER_AUTH_TOKEN]: authHeader.value,
		})

		return true
	}

	return false
}

/**
 * Retrieves stored Twitter authentication tokens
 * @returns Promise resolving to tokens or null if not available
 */
export async function getTwitterTokens(): Promise<TwitterAuthTokens | null> {
	const result = await chrome.storage.session.get([
		STORAGE_KEYS.TWITTER_COOKIE,
		STORAGE_KEYS.TWITTER_CSRF,
		STORAGE_KEYS.TWITTER_AUTH_TOKEN,
	])

	if (
		!result[STORAGE_KEYS.TWITTER_COOKIE] ||
		!result[STORAGE_KEYS.TWITTER_CSRF] ||
		!result[STORAGE_KEYS.TWITTER_AUTH_TOKEN]
	) {
		return null
	}

	return {
		cookie: result[STORAGE_KEYS.TWITTER_COOKIE],
		csrf: result[STORAGE_KEYS.TWITTER_CSRF],
		auth: result[STORAGE_KEYS.TWITTER_AUTH_TOKEN],
	}
}

/**
 * Creates HTTP headers for Twitter API requests using stored tokens
 * @param tokens - Twitter authentication tokens
 * @returns Headers object ready for fetch requests
 */
export function createTwitterAPIHeaders(tokens: TwitterAuthTokens): Headers {
	const headers = new Headers()
	headers.append("Cookie", tokens.cookie)
	headers.append("X-Csrf-Token", tokens.csrf)
	headers.append("Authorization", tokens.auth)
	headers.append("Content-Type", "application/json")
	headers.append(
		"User-Agent",
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
	)
	headers.append("Accept", "*/*")
	headers.append("Accept-Language", "en-US,en;q=0.9")
	return headers
}
