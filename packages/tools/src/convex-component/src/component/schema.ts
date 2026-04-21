import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
	/**
	 * API call logs for dashboard visibility
	 */
	apiLogs: defineTable({
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
		timestamp: v.number(),
	})
		.index("by_endpoint", ["endpoint"])
		.index("by_container", ["containerTag"])
		.index("by_timestamp", ["timestamp"])
		.index("by_status", ["responseStatus"]),

	/**
	 * Component configuration
	 */
	config: defineTable({
		key: v.string(),
		value: v.any(),
	}).index("by_key", ["key"]),

	/**
	 * Memories - Core memory storage
	 * Stores original content and extracted memories from Supermemory
	 */
	memories: defineTable({
		content: v.string(),
		containerTag: v.string(),
		source: v.union(
			v.literal("chat"),
			v.literal("document"),
			v.literal("manual"),
		),
		supermemoryId: v.optional(v.string()),
		extractedMemories: v.optional(v.array(v.string())),
		createdAt: v.number(),
		metadata: v.optional(v.any()),
	})
		.index("by_container", ["containerTag"])
		.index("by_source", ["source"])
		.index("by_source_container", ["source", "containerTag"])
		.index("by_created", ["createdAt"]),

	/**
	 * Chat Sessions - Conversation history with memory usage
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
		memoriesRetrieved: v.array(v.string()),
		createdAt: v.number(),
		lastMessageAt: v.number(),
	})
		.index("by_container", ["containerTag"])
		.index("by_last_message", ["lastMessageAt"]),

	/**
	 * Analytics - Usage statistics per user
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
