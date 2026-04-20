import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

/**
 * Convex schema for Supermemory component
 *
 * This schema defines tables for caching Supermemory API responses,
 * enabling reactive queries and reducing API calls.
 */
export default defineSchema({
	/**
	 * Cached search results from Supermemory
	 * Stores recent search queries and their results for fast reactive access
	 */
	searchCache: defineTable({
		query: v.string(),
		containerTag: v.string(),
		searchMode: v.optional(
			v.union(
				v.literal("hybrid"),
				v.literal("memories"),
				v.literal("documents"),
			),
		),
		results: v.any(), // Accept any shape from Supermemory API
		timing: v.number(),
		total: v.number(),
		expiresAt: v.number(), // Timestamp when cache expires
	})
		.index("by_query_container", ["query", "containerTag"])
		.index("by_expires", ["expiresAt"]),

	/**
	 * Cached user profiles from Supermemory
	 * Stores user context (static + dynamic facts) for fast access
	 */
	profileCache: defineTable({
		containerTag: v.string(),
		staticProfile: v.array(v.string()),
		dynamicProfile: v.array(v.string()),
		searchResults: v.optional(
			v.array(
				v.object({
					id: v.string(),
					memory: v.optional(v.string()),
					chunk: v.optional(v.string()),
					similarity: v.number(),
					metadata: v.optional(v.any()),
				}),
			),
		),
		expiresAt: v.number(),
	})
		.index("by_container", ["containerTag"])
		.index("by_expires", ["expiresAt"]),

	/**
	 * Metadata about documents/memories added to Supermemory
	 * Tracks what content has been sent to Supermemory for analytics
	 */
	documents: defineTable({
		documentId: v.string(), // Supermemory document ID
		customId: v.optional(v.string()),
		containerTag: v.string(),
		contentPreview: v.string(), // First 200 chars for reference
		metadata: v.optional(v.any()),
		status: v.union(
			v.literal("queued"),
			v.literal("processed"),
			v.literal("failed"),
		),
		addedAt: v.number(),
	})
		.index("by_container", ["containerTag"])
		.index("by_custom_id", ["customId"])
		.index("by_document_id", ["documentId"])
		.index("by_status", ["status"]),

	/**
	 * API call logs for dashboard visibility
	 * Tracks all Supermemory API calls for debugging and analytics
	 */
	apiLogs: defineTable({
		endpoint: v.string(), // "add", "search", "profile", etc.
		containerTag: v.optional(v.string()),
		requestBody: v.optional(v.any()),
		responseStatus: v.union(
			v.literal("success"),
			v.literal("error"),
			v.literal("pending"),
		),
		responseTime: v.optional(v.number()), // milliseconds
		errorMessage: v.optional(v.string()),
		timestamp: v.number(),
	})
		.index("by_endpoint", ["endpoint"])
		.index("by_container", ["containerTag"])
		.index("by_timestamp", ["timestamp"])
		.index("by_status", ["responseStatus"]),

	/**
	 * Component configuration
	 * Stores API key and other settings
	 */
	config: defineTable({
		key: v.string(),
		value: v.any(),
	}).index("by_key", ["key"]),

	/**
	 * Memories - Core memory storage
	 * All user memories saved through Supermemory
	 */
	memories: defineTable({
		content: v.string(),
		containerTag: v.string(),
		source: v.union(
			v.literal("chat"),
			v.literal("document"),
			v.literal("manual"),
		),
		supermemoryId: v.optional(v.string()), // ID from Supermemory API
		createdAt: v.number(),
		metadata: v.optional(v.any()),
	})
		.index("by_container", ["containerTag"])
		.index("by_source", ["source"])
		.index("by_source_container", ["source", "containerTag"])
		.index("by_created", ["createdAt"]),

	/**
	 * Chat Sessions - Conversation history with memory usage
	 * Tracks full conversations and which memories were retrieved
	 */
	chatSessions: defineTable({
		containerTag: v.string(),
		messages: v.array(
			v.object({
				role: v.union(v.literal("user"), v.literal("assistant")),
				content: v.string(),
				timestamp: v.number(),
			}),
		),
		memoriesRetrieved: v.array(v.string()), // IDs of memories used in this session
		createdAt: v.number(),
		lastMessageAt: v.number(),
	})
		.index("by_container", ["containerTag"])
		.index("by_last_message", ["lastMessageAt"]),

	/**
	 * Analytics - Usage statistics per user
	 * Dashboard metrics for monitoring
	 */
	analytics: defineTable({
		containerTag: v.string(),
		totalMemories: v.number(),
		totalChats: v.number(),
		totalSearches: v.number(),
		avgResponseTime: v.number(),
		lastActive: v.number(),
	}).index("by_container", ["containerTag"]),
})
