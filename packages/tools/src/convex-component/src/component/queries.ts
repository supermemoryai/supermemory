import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Supermemory Queries
 *
 * Queries provide reactive, read-only access to cached Supermemory data.
 * Components using these queries will automatically re-render when data changes.
 */

/**
 * Get cached search results
 * Returns cached search results if available and not expired
 */
export const getSearchCache = query({
  args: {
    query: v.string(),
    containerTag: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const cached = await ctx.db
      .query("searchCache")
      .withIndex("by_query_container", (q) =>
        q.eq("query", args.query).eq("containerTag", args.containerTag)
      )
      .first();

    // Return null if cache expired
    if (!cached || cached.expiresAt < now) {
      return null;
    }

    return cached;
  },
});

/**
 * Get cached user profile
 * Returns cached profile if available and not expired
 */
export const getProfileCache = query({
  args: {
    containerTag: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const cached = await ctx.db
      .query("profileCache")
      .withIndex("by_container", (q) => q.eq("containerTag", args.containerTag))
      .first();

    // Return null if cache expired
    if (!cached || cached.expiresAt < now) {
      return null;
    }

    return cached;
  },
});

/**
 * List documents added to Supermemory
 * Provides visibility into what content has been indexed
 */
export const listDocuments = query({
  args: {
    containerTag: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.containerTag) {
      return await ctx.db
        .query("documents")
        .withIndex("by_container", (q) =>
          q.eq("containerTag", args.containerTag)
        )
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("documents").order("desc").take(limit);
  },
});

/**
 * Get document by custom ID
 * Find a specific document using your custom identifier
 */
export const getDocumentByCustomId = query({
  args: {
    customId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_custom_id", (q) => q.eq("customId", args.customId))
      .first();
  },
});

/**
 * Get API call logs
 * View recent Supermemory API calls for debugging and analytics
 */
export const getApiLogs = query({
  args: {
    endpoint: v.optional(v.string()),
    containerTag: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    if (args.endpoint) {
      return await ctx.db
        .query("apiLogs")
        .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
        .order("desc")
        .take(limit);
    }

    if (args.containerTag) {
      return await ctx.db
        .query("apiLogs")
        .withIndex("by_container", (q) => q.eq("containerTag", args.containerTag))
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("apiLogs").order("desc").take(limit);
  },
});

/**
 * Get API statistics
 * Aggregate stats for dashboard visibility
 */
export const getApiStats = query({
  args: {
    containerTag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logs = args.containerTag
      ? await ctx.db
          .query("apiLogs")
          .withIndex("by_container", (q) =>
            q.eq("containerTag", args.containerTag)
          )
          .collect()
      : await ctx.db.query("apiLogs").collect();

    const stats = {
      totalCalls: logs.length,
      successfulCalls: logs.filter((l) => l.responseStatus === "success").length,
      failedCalls: logs.filter((l) => l.responseStatus === "error").length,
      averageResponseTime:
        logs.reduce((sum, l) => sum + (l.responseTime || 0), 0) / logs.length ||
        0,
      callsByEndpoint: {} as Record<string, number>,
    };

    // Count calls by endpoint
    for (const log of logs) {
      stats.callsByEndpoint[log.endpoint] =
        (stats.callsByEndpoint[log.endpoint] || 0) + 1;
    }

    return stats;
  },
});

/**
 * Search documents locally (in Convex cache)
 * Fast text search across cached content previews
 */
export const searchCachedDocuments = query({
  args: {
    searchText: v.string(),
    containerTag: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const searchLower = args.searchText.toLowerCase();

    const query = args.containerTag
      ? ctx.db
          .query("documents")
          .withIndex("by_container", (q) =>
            q.eq("containerTag", args.containerTag)
          )
      : ctx.db.query("documents");

    const allDocs = await query.collect();

    // Simple text matching on content preview
    return allDocs
      .filter((doc) => doc.contentPreview.toLowerCase().includes(searchLower))
      .slice(0, limit);
  },
});
