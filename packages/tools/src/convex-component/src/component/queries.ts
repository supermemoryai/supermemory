import { query } from "./_generated/server"
import { v } from "convex/values"

/**
 * Get API call logs
 */
export const getApiLogs = query({
	args: {
		endpoint: v.optional(v.string()),
		containerTag: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 100

		if (args.endpoint) {
			return await ctx.db
				.query("apiLogs")
				.withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
				.order("desc")
				.take(limit)
		}

		if (args.containerTag) {
			return await ctx.db
				.query("apiLogs")
				.withIndex("by_container", (q) =>
					q.eq("containerTag", args.containerTag),
				)
				.order("desc")
				.take(limit)
		}

		return await ctx.db.query("apiLogs").order("desc").take(limit)
	},
})

/**
 * Get API statistics
 */
export const getApiStats = query({
	args: {
		containerTag: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 1000
		const logs = args.containerTag
			? await ctx.db
					.query("apiLogs")
					.withIndex("by_container", (q) =>
						q.eq("containerTag", args.containerTag),
					)
					.order("desc")
					.take(limit)
			: await ctx.db.query("apiLogs").order("desc").take(limit)

		const stats = {
			totalCalls: logs.length,
			successfulCalls: logs.filter((l) => l.responseStatus === "success")
				.length,
			failedCalls: logs.filter((l) => l.responseStatus === "error").length,
			averageResponseTime:
				logs.reduce((sum, l) => sum + (l.responseTime || 0), 0) / logs.length ||
				0,
			callsByEndpoint: {} as Record<string, number>,
		}

		for (const log of logs) {
			stats.callsByEndpoint[log.endpoint] =
				(stats.callsByEndpoint[log.endpoint] || 0) + 1
		}

		return stats
	},
})

/**
 * List memories for a user
 * Includes content and extractedMemories
 */
export const listMemories = query({
	args: {
		containerTag: v.string(),
		source: v.optional(
			v.union(v.literal("chat"), v.literal("document"), v.literal("manual")),
		),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 50

		if (args.source) {
			return await ctx.db
				.query("memories")
				.withIndex("by_source_container", (q) =>
					q.eq("source", args.source).eq("containerTag", args.containerTag),
				)
				.order("desc")
				.take(limit)
		}

		return await ctx.db
			.query("memories")
			.withIndex("by_container", (q) => q.eq("containerTag", args.containerTag))
			.order("desc")
			.take(limit)
	},
})

/**
 * Get chat sessions for a user
 */
export const getChatSessions = query({
	args: {
		containerTag: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20

		return await ctx.db
			.query("chatSessions")
			.withIndex("by_container", (q) => q.eq("containerTag", args.containerTag))
			.order("desc")
			.take(limit)
	},
})

/**
 * Get a specific chat session
 */
export const getChatSession = query({
	args: {
		sessionId: v.id("chatSessions"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.sessionId)
	},
})

/**
 * Get analytics for a user
 */
export const getAnalytics = query({
	args: {
		containerTag: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("analytics")
			.withIndex("by_container", (q) => q.eq("containerTag", args.containerTag))
			.first()
	},
})

/**
 * Get dashboard overview
 */
export const getDashboardOverview = query({
	args: {
		containerTag: v.string(),
	},
	handler: async (ctx, args) => {
		const analytics = await ctx.db
			.query("analytics")
			.withIndex("by_container", (q) => q.eq("containerTag", args.containerTag))
			.first()

		const recentMemories = await ctx.db
			.query("memories")
			.withIndex("by_container", (q) => q.eq("containerTag", args.containerTag))
			.order("desc")
			.take(10)

		const recentSessions = await ctx.db
			.query("chatSessions")
			.withIndex("by_container", (q) => q.eq("containerTag", args.containerTag))
			.order("desc")
			.take(5)

		return {
			analytics: analytics || {
				totalMemories: 0,
				totalChats: 0,
				totalSearches: 0,
				avgResponseTime: 0,
				lastActive: Date.now(),
			},
			recentMemories,
			recentSessions,
		}
	},
})
