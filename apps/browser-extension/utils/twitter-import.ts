/**
 * Twitter Bookmarks Import Module
 * Handles the import process for Twitter bookmarks
 */
import { saveAllTweets } from "./api"
import type { MemoryPayload } from "./types"
import { createTwitterAPIHeaders } from "./twitter-auth"
import { getTwitterTokens } from "./storage"
import {
	BOOKMARKS_URL,
	BOOKMARK_COLLECTION_URL,
	buildRequestVariables,
	buildBookmarkCollectionVariables,
	extractNextCursor,
	getAllTweets,
	type TwitterAPIResponse,
} from "./twitter-utils"

export type ImportProgressCallback = (message: string) => Promise<void>

export type ImportCompleteCallback = (totalImported: number) => Promise<void>

export interface TwitterImportConfig {
	isFolderImport?: boolean
	bookmarkCollectionId?: string
	selectedProject?: {
		id: string
		name: string
		containerTag: string
	}
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
		const uniqueGroupId = crypto.randomUUID()

		try {
			await this.batchImportAll("", 0, uniqueGroupId)
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
	private async batchImportAll(
		cursor = "",
		totalImported = 0,
		uniqueGroupId = "twitter_bookmarks",
	): Promise<void> {
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
			const variables =
				this.config.isFolderImport && this.config.bookmarkCollectionId
					? buildBookmarkCollectionVariables(this.config.bookmarkCollectionId)
					: buildRequestVariables(cursor)
			const urlWithCursor = cursor
				? `${
						this.config.isFolderImport && this.config.bookmarkCollectionId
							? `${BOOKMARK_COLLECTION_URL}&variables=${encodeURIComponent(JSON.stringify(variables))}`
							: BOOKMARKS_URL
					}&variables=${encodeURIComponent(JSON.stringify(variables))}`
				: this.config.isFolderImport && this.config.bookmarkCollectionId
					? `${BOOKMARK_COLLECTION_URL}&variables=${encodeURIComponent(JSON.stringify(variables))}`
					: `${BOOKMARKS_URL}&variables=${encodeURIComponent(JSON.stringify(variables))}`

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
					return this.batchImportAll(cursor, totalImported, uniqueGroupId)
				}
				throw new Error(
					`Failed to fetch data: ${response.status} - ${errorText}`,
				)
			}

			const data: TwitterAPIResponse = await response.json()
			const tweets = getAllTweets(data)

			const documents: MemoryPayload[] = []

			// Convert tweets to MemoryPayload
			for (const tweet of tweets) {
				try {
					const metadata = {
						sm_source: "consumer",
						tweet_id: tweet.id_str,
						author: tweet.user.screen_name,
						created_at: tweet.created_at,
						likes: tweet.favorite_count,
						retweets: tweet.retweet_count || 0,
						sm_internal_group_id: uniqueGroupId,
					}
					const containerTag =
						this.config.selectedProject?.containerTag ||
						"sm_project_twitter_bookmarks"

					documents.push({
						containerTags: [containerTag],
						content: `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
						metadata,
						customId: tweet.id_str,
					})
					importedCount++
					await this.config.onProgress(
						`Imported ${importedCount} tweets, so far...`,
					)
				} catch (error) {
					console.error("Error importing tweet:", error)
				}
			}

			try {
				if (documents.length > 0) {
					await saveAllTweets(documents)
				}
				console.log("Tweets saved")
				console.log("Documents:", documents)
			} catch (error) {
				console.error("Error saving tweets batch:", error)
				await this.config.onError(error as Error)
				return
			}

			// Handle pagination
			const instructions =
				data.data?.bookmark_timeline_v2?.timeline?.instructions ||
				data.data?.bookmark_collection_timeline?.timeline?.instructions ||
				[]
			const nextCursor = extractNextCursor(instructions)

			console.log("Next cursor:", nextCursor)
			console.log("Tweets length:", tweets.length)

			if (nextCursor && tweets.length > 0 && !this.config.isFolderImport) {
				await new Promise((resolve) => setTimeout(resolve, 1000)) // Rate limiting
				await this.batchImportAll(nextCursor, importedCount, uniqueGroupId)
			} else {
				await this.config.onComplete(importedCount)
			}
		} catch (error) {
			console.error("Batch import error:", error)
			await this.config.onError(error as Error)
		}
	}
}
