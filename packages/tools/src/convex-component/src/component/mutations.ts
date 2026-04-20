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
    searchMode: v.optional(v.union(v.literal("hybrid"), v.literal("memories"), v.literal("documents"))),
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

/**
 * Store a memory
 * Tracks individual memories in the dashboard
 */
export const storeMemory = internalMutation({
  args: {
    content: v.string(),
    containerTag: v.string(),
    source: v.union(v.literal("chat"), v.literal("document"), v.literal("manual")),
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
    });
  },
});

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
    if (args.sessionId) {
      // Update existing session
      const session = await ctx.db.get(args.sessionId);
      if (session) {
        await ctx.db.patch(args.sessionId, {
          messages: [...session.messages, args.newMessage],
          memoriesRetrieved: [
            ...new Set([...session.memoriesRetrieved, ...args.memoriesRetrieved])
          ],
          lastMessageAt: args.newMessage.timestamp,
        });
        return args.sessionId;
      }
    }

    // Create new session
    const sessionId = await ctx.db.insert("chatSessions", {
      containerTag: args.containerTag,
      messages: [args.newMessage],
      memoriesRetrieved: args.memoriesRetrieved,
      createdAt: Date.now(),
      lastMessageAt: args.newMessage.timestamp,
    });
    return sessionId;
  },
});

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
    // Inline the logic instead of calling another mutation
    if (args.sessionId) {
      // Update existing session
      const session = await ctx.db.get(args.sessionId);
      if (session) {
        await ctx.db.patch(args.sessionId, {
          messages: [...session.messages, args.newMessage],
          memoriesRetrieved: [
            ...new Set([...session.memoriesRetrieved, ...args.memoriesRetrieved])
          ],
          lastMessageAt: args.newMessage.timestamp,
        });
        return args.sessionId;
      }
    }

    // Create new session
    const sessionId = await ctx.db.insert("chatSessions", {
      containerTag: args.containerTag,
      messages: [args.newMessage],
      memoriesRetrieved: args.memoriesRetrieved,
      createdAt: Date.now(),
      lastMessageAt: args.newMessage.timestamp,
    });
    return sessionId;
  },
});

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
      .first();

    if (existing) {
      // Update existing analytics
      const updates: any = {
        lastActive: Date.now(),
      };

      if (args.incrementMemories) {
        updates.totalMemories = existing.totalMemories + args.incrementMemories;
      }
      if (args.incrementChats) {
        updates.totalChats = existing.totalChats + args.incrementChats;
      }
      if (args.incrementSearches) {
        updates.totalSearches = existing.totalSearches + args.incrementSearches;
      }
      if (args.responseTime) {
        // Calculate new average
        const totalTime = existing.avgResponseTime * existing.totalSearches;
        const newTotal = totalTime + args.responseTime;
        updates.avgResponseTime = newTotal / (existing.totalSearches + 1);
      }

      await ctx.db.patch(existing._id, updates);
    } else {
      // Create new analytics entry
      await ctx.db.insert("analytics", {
        containerTag: args.containerTag,
        totalMemories: args.incrementMemories || 0,
        totalChats: args.incrementChats || 0,
        totalSearches: args.incrementSearches || 0,
        avgResponseTime: args.responseTime || 0,
        lastActive: Date.now(),
      });
    }
  },
});
