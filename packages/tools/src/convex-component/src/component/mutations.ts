import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Supermemory Mutations
 *
 * Mutations handle all database writes in transactions.
 * These functions update the Convex cache with Supermemory data.
 */

/**
 * Cache search results
 * Stores search results from Supermemory API for reactive access
 */
export const cacheSearchResults = internalMutation({
  args: {
    query: v.string(),
    containerTag: v.string(),
    searchMode: v.optional(v.union(v.literal("hybrid"), v.literal("memories"))),
    results: v.array(v.any()), // Accept any shape from Supermemory API
    timing: v.number(),
    total: v.number(),
    ttl: v.number(), // Time to live in seconds
  },
  handler: async (ctx, args) => {
    const expiresAt = Date.now() + args.ttl * 1000;

    // Check if cache already exists
    const existing = await ctx.db
      .query("searchCache")
      .withIndex("by_query_container", (q) =>
        q.eq("query", args.query).eq("containerTag", args.containerTag)
      )
      .first();

    if (existing) {
      // Update existing cache
      await ctx.db.patch(existing._id, {
        results: args.results,
        timing: args.timing,
        total: args.total,
        expiresAt,
        searchMode: args.searchMode,
      });
    } else {
      // Create new cache entry
      await ctx.db.insert("searchCache", {
        query: args.query,
        containerTag: args.containerTag,
        searchMode: args.searchMode,
        results: args.results,
        timing: args.timing,
        total: args.total,
        expiresAt,
      });
    }
  },
});

/**
 * Cache user profile
 * Stores user profile from Supermemory API for reactive access
 */
export const cacheProfile = internalMutation({
  args: {
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
        })
      )
    ),
    ttl: v.number(),
  },
  handler: async (ctx, args) => {
    const expiresAt = Date.now() + args.ttl * 1000;

    // Check if profile cache exists
    const existing = await ctx.db
      .query("profileCache")
      .withIndex("by_container", (q) => q.eq("containerTag", args.containerTag))
      .first();

    if (existing) {
      // Update existing cache
      await ctx.db.patch(existing._id, {
        staticProfile: args.staticProfile,
        dynamicProfile: args.dynamicProfile,
        searchResults: args.searchResults,
        expiresAt,
      });
    } else {
      // Create new cache entry
      await ctx.db.insert("profileCache", {
        containerTag: args.containerTag,
        staticProfile: args.staticProfile,
        dynamicProfile: args.dynamicProfile,
        searchResults: args.searchResults,
        expiresAt,
      });
    }
  },
});

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
    status: v.union(v.literal("queued"), v.literal("processed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    // Check if document with this customId or documentId exists
    const existingByCustomId = args.customId
      ? await ctx.db
          .query("documents")
          .withIndex("by_custom_id", (q) => q.eq("customId", args.customId))
          .first()
      : null;

    const existingByDocId = await ctx.db
      .query("documents")
      .withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
      .first();

    const existing = existingByCustomId || existingByDocId;

    if (existing) {
      // Update existing document
      await ctx.db.patch(existing._id, {
        documentId: args.documentId,
        customId: args.customId,
        contentPreview: args.contentPreview,
        metadata: args.metadata,
        status: args.status,
      });
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
      });
    }
  },
});

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
      v.literal("pending")
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
    });
  },
});

/**
 * Clean expired cache entries
 * Removes expired search and profile caches
 */
export const cleanExpiredCache = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Clean expired search caches
    const expiredSearches = await ctx.db
      .query("searchCache")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();

    for (const cache of expiredSearches) {
      await ctx.db.delete(cache._id);
    }

    // Clean expired profile caches
    const expiredProfiles = await ctx.db
      .query("profileCache")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();

    for (const cache of expiredProfiles) {
      await ctx.db.delete(cache._id);
    }

    return {
      cleanedSearchCaches: expiredSearches.length,
      cleanedProfileCaches: expiredProfiles.length,
    };
  },
});

/**
 * Update document status
 * Updates the processing status of a document
 */
export const updateDocumentStatus = mutation({
  args: {
    documentId: v.string(),
    status: v.union(v.literal("queued"), v.literal("processed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("documents")
      .withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
      .first();

    if (!doc) {
      throw new Error(`Document ${args.documentId} not found`);
    }

    await ctx.db.patch(doc._id, { status: args.status });
  },
});

/**
 * Initialize or update API key
 * Stores the Supermemory API key in Convex
 */
export const setApiKey = mutation({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", "SUPERMEMORY_API_KEY"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.apiKey });
    } else {
      await ctx.db.insert("config", {
        key: "SUPERMEMORY_API_KEY",
        value: args.apiKey,
      });
    }
  },
});
