/**
 * Centralized storage layer using WXT's built-in storage API
 */

import { storage } from '#imports';
import type { Project } from "./types"

/**
 * User authentication and profile data
 */
export interface UserData {
	userId?: string
	email?: string
	name?: string
}

/**
 * Twitter authentication tokens for API requests
 */
export interface TwitterAuthTokens {
	cookie: string
	csrf: string
	auth: string
}

/**
 * Local Storage Items (persistent across sessions)
 */
export const bearerToken = storage.defineItem<string>("local:bearer-token")

export const userData = storage.defineItem<UserData>("local:user-data")

export const defaultProject = storage.defineItem<Project>(
	"local:sm-default-project",
)

export const autoSearchEnabled = storage.defineItem<boolean>(
	"local:sm-auto-search-enabled",
	{
		fallback: false,
	},
)

export const autoCapturePromptsEnabled = storage.defineItem<boolean>(
	"local:sm-auto-capture-prompts-enabled",
	{
		fallback: false,
	},
)

/**
 * Session Storage Items (cleared when browser closes)
 */
export const tokensLogged = storage.defineItem<boolean>(
	"session:tokens-logged",
	{
		fallback: false,
	},
)

export const twitterCookie = storage.defineItem<string>(
	"session:twitter-cookie",
)

export const twitterCsrf = storage.defineItem<string>("session:twitter-csrf")

export const twitterAuthToken = storage.defineItem<string>(
	"session:twitter-auth-token",
)

/**
 * Helper function to get Twitter authentication tokens
 * @returns Promise resolving to tokens or null if not available
 */
export async function getTwitterTokens(): Promise<TwitterAuthTokens | null> {
	const [cookie, csrf, auth] = await Promise.all([
		twitterCookie.getValue(),
		twitterCsrf.getValue(),
		twitterAuthToken.getValue(),
	])

	if (!cookie || !csrf || !auth) {
		return null
	}

	return {
		cookie,
		csrf,
		auth,
	}
}

/**
 * Helper function to set Twitter authentication tokens
 * @param tokens - Twitter authentication tokens to store
 */
export async function setTwitterTokens(
	tokens: TwitterAuthTokens,
): Promise<void> {
	await Promise.all([
		twitterCookie.setValue(tokens.cookie),
		twitterCsrf.setValue(tokens.csrf),
		twitterAuthToken.setValue(tokens.auth),
	])
}

/**
 * Helper function to check if tokens have been logged (for one-time logging)
 * @returns Promise resolving to boolean indicating if tokens were previously logged
 */
export async function getTokensLogged(): Promise<boolean> {
	return (await tokensLogged.getValue()) ?? false
}

/**
 * Helper function to mark tokens as logged
 */
export async function setTokensLogged(): Promise<void> {
	await tokensLogged.setValue(true)
}

