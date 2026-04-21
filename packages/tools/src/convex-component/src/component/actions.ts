import { action } from "./_generated/server"
import { v } from "convex/values"
import Supermemory from "supermemory"
import { internal } from "./_generated/api"

/**
 * Add content to Supermemory
 * Stores text and then searches for the extracted memories from it
 */
export const add = action({
	args: {
		content: v.string(),
		containerTag: v.string(),
		customId: v.optional(v.string()),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const startTime = Date.now()

		try {
			const apiKey = await ctx.runQuery(internal.lib.getApiKey)
			const client = new Supermemory({ apiKey })

			// Add content to Supermemory
			const result = await client.add({
				content: args.content,
				containerTag: args.containerTag,
				customId: args.customId,
				metadata: args.metadata,
			})

			const responseTime = Date.now() - startTime

			// Search for extracted memories from this content
			let extractedMemories: string[] = []
			try {
				// Small delay to let Supermemory process
				await new Promise((r) => setTimeout(r, 1000))
				const searchResult = await client.search.memories({
					q: args.content,
					containerTag: args.containerTag,
					searchMode: "memories",
					limit: 10,
				})
				extractedMemories = (searchResult.results || [])
					.map((r: any) => r.memory || r.chunk || "")
					.filter((m: string) => m.length > 0)
			} catch {
				// Extraction might not be ready yet, that's ok
			}

			// Store memory with extracted memories
			await ctx.runMutation(internal.mutations.storeMemory, {
				content: args.content,
				containerTag: args.containerTag,
				source: "manual",
				supermemoryId: result.id,
				extractedMemories,
				metadata: args.metadata,
			})

			// Update analytics
			await ctx.runMutation(internal.mutations.updateAnalytics, {
				containerTag: args.containerTag,
				incrementMemories: 1,
			})

			// Log API call
			const logBody = { ...args, content: args.content.substring(0, 500) }
			await ctx.runMutation(internal.mutations.logApiCall, {
				endpoint: "add",
				containerTag: args.containerTag,
				requestBody: logBody,
				responseStatus: "success",
				responseTime,
			})

			return result
		} catch (error) {
			const responseTime = Date.now() - startTime

			try {
				const logBody = { ...args, content: args.content.substring(0, 500) }
				await ctx.runMutation(internal.mutations.logApiCall, {
					endpoint: "add",
					containerTag: args.containerTag,
					requestBody: logBody,
					responseStatus: "error",
					responseTime,
					errorMessage:
						error instanceof Error ? error.message : "Unknown error",
				})
			} catch {
				console.error("[Supermemory] Failed to log API error")
			}

			throw error
		}
	},
})

/**
 * Search memories and documents
 */
export const search = action({
	args: {
		q: v.string(),
		containerTag: v.string(),
		searchMode: v.optional(
			v.union(
				v.literal("hybrid"),
				v.literal("memories"),
				v.literal("documents"),
			),
		),
		limit: v.optional(v.number()),
		threshold: v.optional(v.number()),
		rerank: v.optional(v.boolean()),
		filters: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const startTime = Date.now()

		try {
			const apiKey = await ctx.runQuery(internal.lib.getApiKey)
			const client = new Supermemory({ apiKey })

			const result = await client.search.memories({
				q: args.q,
				containerTag: args.containerTag,
				searchMode: args.searchMode || "hybrid",
				limit: args.limit,
				threshold: args.threshold,
				rerank: args.rerank,
				filters: args.filters,
			})

			const responseTime = Date.now() - startTime

			// Update analytics
			await ctx.runMutation(internal.mutations.updateAnalytics, {
				containerTag: args.containerTag,
				incrementSearches: 1,
				responseTime,
			})

			// Log API call
			const logBody = {
				q: args.q,
				containerTag: args.containerTag,
				searchMode: args.searchMode,
				limit: args.limit,
			}
			await ctx.runMutation(internal.mutations.logApiCall, {
				endpoint: "search",
				containerTag: args.containerTag,
				requestBody: logBody,
				responseStatus: "success",
				responseTime,
			})

			return result
		} catch (error) {
			const responseTime = Date.now() - startTime

			try {
				const logBody = {
					q: args.q,
					containerTag: args.containerTag,
					searchMode: args.searchMode,
					limit: args.limit,
				}
				await ctx.runMutation(internal.mutations.logApiCall, {
					endpoint: "search",
					containerTag: args.containerTag,
					requestBody: logBody,
					responseStatus: "error",
					responseTime,
					errorMessage:
						error instanceof Error ? error.message : "Unknown error",
				})
			} catch {
				console.error("[Supermemory] Failed to log API error")
			}

			throw error
		}
	},
})

/**
 * Get user profile with context
 */
export const profile = action({
	args: {
		containerTag: v.string(),
		q: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const startTime = Date.now()

		try {
			const apiKey = await ctx.runQuery(internal.lib.getApiKey)
			const client = new Supermemory({ apiKey })

			const result = await client.profile({
				containerTag: args.containerTag,
				q: args.q,
			})

			const responseTime = Date.now() - startTime

			await ctx.runMutation(internal.mutations.logApiCall, {
				endpoint: "profile",
				containerTag: args.containerTag,
				requestBody: args,
				responseStatus: "success",
				responseTime,
			})

			return result
		} catch (error) {
			const responseTime = Date.now() - startTime

			try {
				await ctx.runMutation(internal.mutations.logApiCall, {
					endpoint: "profile",
					containerTag: args.containerTag,
					requestBody: args,
					responseStatus: "error",
					responseTime,
					errorMessage:
						error instanceof Error ? error.message : "Unknown error",
				})
			} catch {
				console.error("[Supermemory] Failed to log API error")
			}

			throw error
		}
	},
})
