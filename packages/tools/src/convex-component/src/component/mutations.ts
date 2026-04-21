import { internalMutation, mutation } from "./_generated/server"
import { v } from "convex/values"

/**
 * Supermemory Mutations
 *
 * Mutations handle all database writes in transactions.
 * These functions update the Convex cache with Supermemory data.
 */

/**
 * Store document metadata
 * Tracks documents/memories added to Supermemory
 */
export const storeDocument = internalMutation({
	args: {
		documentId: v.string(),
		customId: v.optional(v.string()),
		containerTag: v.string(),
		contentPreview: v.string(),
		metadata: v.optional(v.any()),
		status: v.union(
			v.literal("queued"),
			v.literal("processed"),
			v.literal("failed"),
		),
	},
	handler: async (ctx, args) => {
		// Check if document with this customId or documentId exists
		const existingByCustomId = args.customId
			? await ctx.db
					.query("documents")
					.withIndex("by_custom_id", (q) => q.eq("customId", args.customId))
					.first()
			: null

		const existingByDocId = await ctx.db
			.query("documents")
			.withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
			.first()

		const existing = existingByCustomId || existingByDocId

		if (existing) {
			// Update existing document
			await ctx.db.patch(existing._id, {
				documentId: args.documentId,
				customId: args.customId,
				contentPreview: args.contentPreview,
				metadata: args.metadata,
				status: args.status,
			})
		} else {
			// Create new document entry
			await ctx.db.insert("documents", {
				documentId: args.documentId,
				customId: args.customId,
				containerTag: args.containerTag,
				contentPreview: args.contentPreview,
				metadata: args.metadata,
				status: args.status,
				addedAt: Date.now(),
			})
		}
	},
})

/**
 * Log API call
 * Records API calls for debugging and analytics
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
 * Update document status
 * Updates the processing status of a document
 */
export const updateDocumentStatus = mutation({
	args: {
		documentId: v.string(),
		status: v.union(
			v.literal("queued"),
			v.literal("processed"),
			v.literal("failed"),
		),
	},
	handler: async (ctx, args) => {
		const doc = await ctx.db
			.query("documents")
			.withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
			.first()

		if (!doc) {
			throw new Error(`Document ${args.documentId} not found`)
		}

		await ctx.db.patch(doc._id, { status: args.status })
	},
})

/**
 * Initialize or update API key
 * Stores the Supermemory API key in Convex
 *
 * SECURITY NOTE: This is an internal mutation. Use `npx convex env set SUPERMEMORY_API_KEY`
 * for production, or call this from a server-side admin endpoint with proper auth checks.
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
 * Store a memory
 * Tracks individual memories in the dashboard
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
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		await ctx.db.insert("memories", {
			content: args.content,
			containerTag: args.containerTag,
			source: args.source,
			supermemoryId: args.supermemoryId,
			createdAt: Date.now(),
			metadata: args.metadata,
		})
	},
})

/**
 * Create or update chat session
 * Tracks conversation history with memory usage
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
			// Update existing session
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

		// Create new session
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
 * Allows clients to track chat sessions
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
			// Update existing session
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

		// Create new session
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
 * Updates usage statistics for a user
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
			// Update existing analytics
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
				// Only update average when we're also incrementing searches
				const totalTime = existing.avgResponseTime * existing.totalSearches
				const newTotal = totalTime + args.responseTime
				const newSearchCount = existing.totalSearches + args.incrementSearches
				updates.avgResponseTime = newTotal / newSearchCount
			}

			await ctx.db.patch(existing._id, updates)
		} else {
			// Create new analytics entry
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
