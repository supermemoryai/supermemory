/**
 * Twitter Authentication Module
 * Handles token capture and storage for Twitter API access
 */
import {
	getTokensLogged,
	setTokensLogged,
	setTwitterTokens,
	type TwitterAuthTokens,
} from "./storage"

/**
 * Captures Twitter authentication tokens from web request headers
 * @param details - Web request details containing headers
 * @returns True if tokens were captured, false otherwise
 */
export async function captureTwitterTokens(
	details: chrome.webRequest.WebRequestDetails & {
		requestHeaders?: chrome.webRequest.HttpHeader[]
	},
): Promise<boolean> {
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
		const tokensAlreadyLogged = await getTokensLogged()
		if (!tokensAlreadyLogged) {
			console.log("Twitter auth tokens captured successfully")
			await setTokensLogged()
		}

		await setTwitterTokens({
			cookie: cookieHeader.value,
			csrf: csrfHeader.value,
			auth: authHeader.value,
		})

		return true
	}

	return false
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
