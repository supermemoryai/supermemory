/**
 * Twitter Bookmarks Import Module
 * Handles the import process for Twitter bookmarks
 */

import { saveTweet } from "./api"
import { createTwitterAPIHeaders, getTwitterTokens } from "./twitter-auth"
import {
	BOOKMARKS_URL,
	buildRequestVariables,
	extractNextCursor,
	getAllTweets,
	type Tweet,
	type TwitterAPIResponse,
	tweetToMarkdown,
} from "./twitter-utils"

export type ImportProgressCallback = (message: string) => Promise<void>

export type ImportCompleteCallback = (totalImported: number) => Promise<void>

export interface TwitterImportConfig {
	onProgress: ImportProgressCallback
	onComplete: ImportCompleteCallback
	onError: (error: Error) => Promise<void>
}

/**
 * Rate limiting configuration
 */
class RateLimiter {
	private waitTime = 60000 // Start with 1 minute

	async handleRateLimit(onProgress: ImportProgressCallback): Promise<void> {
		const waitTimeInSeconds = this.waitTime / 1000

		await onProgress(
			`Rate limit reached. Waiting for ${waitTimeInSeconds} seconds before retrying...`,
		)

		await new Promise((resolve) => setTimeout(resolve, this.waitTime))
		this.waitTime *= 2 // Exponential backoff
	}

	reset(): void {
		this.waitTime = 60000
	}
}

/**
 * Imports a single tweet to Supermemory
 * @param tweetMd - Tweet content in markdown format
 * @param tweet - Original tweet object with metadata
 * @returns Promise that resolves when tweet is imported
 */
async function importTweet(tweetMd: string, tweet: Tweet): Promise<void> {
	const metadata = {
		sm_source: "consumer",
		tweet_id: tweet.id_str,
		author: tweet.user.screen_name,
		created_at: tweet.created_at,
		likes: tweet.favorite_count,
		retweets: tweet.retweet_count || 0,
	}

	try {
		await saveTweet(tweetMd, metadata)
	} catch (error) {
		throw new Error(
			`Failed to save tweet: ${error instanceof Error ? error.message : "Unknown error"}`,
		)
	}
}

/**
 * Main class for handling Twitter bookmarks import
 */
export class TwitterImporter {
	private importInProgress = false
	private rateLimiter = new RateLimiter()

	constructor(private config: TwitterImportConfig) {}

	/**
	 * Starts the import process for all Twitter bookmarks
	 * @returns Promise that resolves when import is complete
	 */
	async startImport(): Promise<void> {
		if (this.importInProgress) {
			throw new Error("Import already in progress")
		}

		this.importInProgress = true

		try {
			await this.batchImportAll("", 0)
			this.rateLimiter.reset()
		} catch (error) {
			await this.config.onError(error as Error)
		} finally {
			this.importInProgress = false
		}
	}

	/**
	 * Recursive function to import all bookmarks with pagination
	 * @param cursor - Pagination cursor for Twitter API
	 * @param totalImported - Number of tweets imported so far
	 */
	private async batchImportAll(cursor = "", totalImported = 0): Promise<void> {
		try {
			// Use a local variable to track imported count
			let importedCount = totalImported

			// Get authentication tokens
			const tokens = await getTwitterTokens()
			if (!tokens) {
				await this.config.onProgress(
					"Please visit Twitter/X first to capture authentication tokens",
				)
				return
			}

			// Create headers for API request
			const headers = createTwitterAPIHeaders(tokens)

			// Build API request with pagination
			const variables = buildRequestVariables(cursor)
			const urlWithCursor = cursor
				? `${BOOKMARKS_URL}&variables=${encodeURIComponent(JSON.stringify(variables))}`
				: BOOKMARKS_URL

			console.log("Making Twitter API request to:", urlWithCursor)
			console.log("Request headers:", Object.fromEntries(headers.entries()))

			const response = await fetch(urlWithCursor, {
				method: "GET",
				headers,
				redirect: "follow",
			})

			if (!response.ok) {
				const errorText = await response.text()
				console.error(`Twitter API Error ${response.status}:`, errorText)

				if (response.status === 429) {
					await this.rateLimiter.handleRateLimit(this.config.onProgress)
					return this.batchImportAll(cursor, totalImported)
				}
				throw new Error(
					`Failed to fetch data: ${response.status} - ${errorText}`,
				)
			}

			const data: TwitterAPIResponse = await response.json()
			const tweets = getAllTweets(data)

			console.log("Tweets:", tweets)

			// Process each tweet
			for (const tweet of tweets) {
				try {
					const tweetMd = tweetToMarkdown(tweet)
					await importTweet(tweetMd, tweet)
					importedCount++
					await this.config.onProgress(`Imported ${importedCount} tweets`)
				} catch (error) {
					console.error("Error importing tweet:", error)
					// Continue with next tweet
				}
			}

			// Handle pagination
			const instructions =
				data.data?.bookmark_timeline_v2?.timeline?.instructions
			const nextCursor = extractNextCursor(instructions || [])

			console.log("Next cursor:", nextCursor)
			console.log("Tweets length:", tweets.length)

			if (nextCursor && tweets.length > 0) {
				await new Promise((resolve) => setTimeout(resolve, 1000)) // Rate limiting
				await this.batchImportAll(nextCursor, importedCount)
			} else {
				await this.config.onComplete(importedCount)
			}
		} catch (error) {
			console.error("Batch import error:", error)
			await this.config.onError(error as Error)
		}
	}
}
