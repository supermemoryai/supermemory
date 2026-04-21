import { internalMutation, mutation } from "./_generated/server"
import { v } from "convex/values"

/**
 * Log API call
 */
export const logApiCall = internalMutation({
	args: {
		endpoint: v.string(),
		containerTag: v.optional(v.string()),
		requestBody: v.optional(v.any()),
		responseStatus: v.union(
			v.literal("success"),
			v.literal("error"),
			v.literal("pending"),
		),
		responseTime: v.optional(v.number()),
		errorMessage: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await ctx.db.insert("apiLogs", {
			endpoint: args.endpoint,
			containerTag: args.containerTag,
			requestBody: args.requestBody,
			responseStatus: args.responseStatus,
			responseTime: args.responseTime,
			errorMessage: args.errorMessage,
			timestamp: Date.now(),
		})
	},
})

/**
 * Initialize or update API key
 */
export const setApiKey = internalMutation({
	args: {
		apiKey: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("config")
			.withIndex("by_key", (q) => q.eq("key", "SUPERMEMORY_API_KEY"))
			.first()

		if (existing) {
			await ctx.db.patch(existing._id, { value: args.apiKey })
		} else {
			await ctx.db.insert("config", {
				key: "SUPERMEMORY_API_KEY",
				value: args.apiKey,
			})
		}
	},
})

/**
 * Store a memory with extracted memories
 */
export const storeMemory = internalMutation({
	args: {
		content: v.string(),
		containerTag: v.string(),
		source: v.union(
			v.literal("chat"),
			v.literal("document"),
			v.literal("manual"),
		),
		supermemoryId: v.optional(v.string()),
		extractedMemories: v.optional(v.array(v.string())),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		await ctx.db.insert("memories", {
			content: args.content,
			containerTag: args.containerTag,
			source: args.source,
			supermemoryId: args.supermemoryId,
			extractedMemories: args.extractedMemories,
			createdAt: Date.now(),
			metadata: args.metadata,
		})
	},
})

/**
 * Update extracted memories for an existing memory
 */
export const updateExtractedMemories = internalMutation({
	args: {
		memoryId: v.id("memories"),
		extractedMemories: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.memoryId, {
			extractedMemories: args.extractedMemories,
		})
	},
})

/**
 * Create or update chat session
 */
export const updateChatSession = internalMutation({
	args: {
		containerTag: v.string(),
		sessionId: v.optional(v.id("chatSessions")),
		newMessage: v.object({
			role: v.union(v.literal("user"), v.literal("assistant")),
			content: v.string(),
			timestamp: v.number(),
		}),
		memoriesRetrieved: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const MAX_MESSAGES = 500
		if (args.sessionId) {
			const session = await ctx.db.get(args.sessionId)
			if (session) {
				const messages = [...session.messages, args.newMessage].slice(
					-MAX_MESSAGES,
				)
				await ctx.db.patch(args.sessionId, {
					messages,
					memoriesRetrieved: [
						...new Set([
							...session.memoriesRetrieved,
							...args.memoriesRetrieved,
						]),
					],
					lastMessageAt: args.newMessage.timestamp,
				})
				return args.sessionId
			}
		}

		const sessionId = await ctx.db.insert("chatSessions", {
			containerTag: args.containerTag,
			messages: [args.newMessage],
			memoriesRetrieved: args.memoriesRetrieved,
			createdAt: Date.now(),
			lastMessageAt: args.newMessage.timestamp,
		})
		return sessionId
	},
})

/**
 * Public wrapper for updateChatSession
 */
export const trackChatMessage = mutation({
	args: {
		containerTag: v.string(),
		sessionId: v.optional(v.id("chatSessions")),
		newMessage: v.object({
			role: v.union(v.literal("user"), v.literal("assistant")),
			content: v.string(),
			timestamp: v.number(),
		}),
		memoriesRetrieved: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const MAX_MESSAGES = 500
		if (args.sessionId) {
			const session = await ctx.db.get(args.sessionId)
			if (session) {
				const messages = [...session.messages, args.newMessage].slice(
					-MAX_MESSAGES,
				)
				await ctx.db.patch(args.sessionId, {
					messages,
					memoriesRetrieved: [
						...new Set([
							...session.memoriesRetrieved,
							...args.memoriesRetrieved,
						]),
					],
					lastMessageAt: args.newMessage.timestamp,
				})
				return args.sessionId
			}
		}

		const sessionId = await ctx.db.insert("chatSessions", {
			containerTag: args.containerTag,
			messages: [args.newMessage],
			memoriesRetrieved: args.memoriesRetrieved,
			createdAt: Date.now(),
			lastMessageAt: args.newMessage.timestamp,
		})
		return sessionId
	},
})

/**
 * Update analytics
 */
export const updateAnalytics = internalMutation({
	args: {
		containerTag: v.string(),
		incrementMemories: v.optional(v.number()),
		incrementChats: v.optional(v.number()),
		incrementSearches: v.optional(v.number()),
		responseTime: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("analytics")
			.withIndex("by_container", (q) => q.eq("containerTag", args.containerTag))
			.first()

		if (existing) {
			const updates: any = {
				lastActive: Date.now(),
			}

			if (args.incrementMemories) {
				updates.totalMemories = existing.totalMemories + args.incrementMemories
			}
			if (args.incrementChats) {
				updates.totalChats = existing.totalChats + args.incrementChats
			}
			if (args.incrementSearches) {
				updates.totalSearches = existing.totalSearches + args.incrementSearches
			}
			if (args.incrementSearches && args.responseTime) {
				const totalTime = existing.avgResponseTime * existing.totalSearches
				const newTotal = totalTime + args.responseTime
				const newSearchCount = existing.totalSearches + args.incrementSearches
				updates.avgResponseTime = newTotal / newSearchCount
			}

			await ctx.db.patch(existing._id, updates)
		} else {
			await ctx.db.insert("analytics", {
				containerTag: args.containerTag,
				totalMemories: args.incrementMemories || 0,
				totalChats: args.incrementChats || 0,
				totalSearches: args.incrementSearches || 0,
				avgResponseTime: args.responseTime || 0,
				lastActive: Date.now(),
			})
		}
	},
})
