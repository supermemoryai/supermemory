import { action } from "./_generated/server";
import { v } from "convex/values";
import Supermemory from "supermemory";
import { api, internal } from "./_generated/api";

/**
 * Supermemory Actions
 *
 * Actions handle non-deterministic operations like calling external APIs.
 * These functions call the Supermemory REST API and cache results in Convex.
 */

/**
 * Add content to Supermemory
 * Stores text, conversations, files, or URLs in Supermemory for semantic search
 */
export const add = action({
  args: {
    content: v.string(),
    containerTag: v.string(),
    customId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      // Get API key from config
      const apiKey = await ctx.runQuery(internal.lib.getApiKey);
      const client = new Supermemory({ apiKey });

      // Call Supermemory API
      const result = await client.add({
        content: args.content,
        containerTag: args.containerTag,
        customId: args.customId,
        metadata: args.metadata,
      });

      const responseTime = Date.now() - startTime;

      // Store document metadata in Convex
      await ctx.runMutation(internal.mutations.storeDocument, {
        documentId: result.id,
        customId: args.customId,
        containerTag: args.containerTag,
        contentPreview: args.content.substring(0, 200),
        metadata: args.metadata,
        status: result.status === "queued" ? "queued" : "processed",
      });

      // Log API call
      await ctx.runMutation(internal.mutations.logApiCall, {
        endpoint: "add",
        containerTag: args.containerTag,
        requestBody: args,
        responseStatus: "success",
        responseTime,
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log error
      await ctx.runMutation(internal.mutations.logApiCall, {
        endpoint: "add",
        containerTag: args.containerTag,
        requestBody: args,
        responseStatus: "error",
        responseTime,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
});

/**
 * Search memories and documents
 * Performs semantic search across all content in Supermemory
 */
export const search = action({
  args: {
    q: v.string(),
    containerTag: v.string(),
    searchMode: v.optional(v.union(v.literal("hybrid"), v.literal("memories"))),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
    rerank: v.optional(v.boolean()),
    filters: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await ctx.runQuery(api.queries.getSearchCache, {
        query: args.q,
        containerTag: args.containerTag,
      });

      if (cached) {
        return {
          results: cached.results,
          timing: cached.timing,
          total: cached.total,
          cached: true,
        };
      }

      // Get API key from config
      const apiKey = await ctx.runQuery(internal.lib.getApiKey);
      const client = new Supermemory({ apiKey });

      // Call Supermemory API
      const result = await client.search.memories({
        q: args.q,
        containerTag: args.containerTag,
        searchMode: args.searchMode || "hybrid",
        limit: args.limit,
        threshold: args.threshold,
        rerank: args.rerank,
        filters: args.filters,
      });

      const responseTime = Date.now() - startTime;

      // Cache results (expires in 5 minutes)
      await ctx.runMutation(internal.mutations.cacheSearchResults, {
        query: args.q,
        containerTag: args.containerTag,
        searchMode: args.searchMode,
        results: result.results,
        timing: result.timing,
        total: result.total,
        ttl: 300, // 5 minutes
      });

      // Log API call
      await ctx.runMutation(internal.mutations.logApiCall, {
        endpoint: "search",
        containerTag: args.containerTag,
        requestBody: args,
        responseStatus: "success",
        responseTime,
      });

      return {
        ...result,
        cached: false,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log error
      await ctx.runMutation(internal.mutations.logApiCall, {
        endpoint: "search",
        containerTag: args.containerTag,
        requestBody: args,
        responseStatus: "error",
        responseTime,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
});

/**
 * Get user profile with context
 * Retrieves static/dynamic facts about a user plus relevant memories
 */
export const profile = action({
  args: {
    containerTag: v.string(),
    q: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await ctx.runQuery(api.queries.getProfileCache, {
        containerTag: args.containerTag,
      });

      if (cached) {
        return {
          profile: {
            static: cached.staticProfile,
            dynamic: cached.dynamicProfile,
          },
          searchResults: cached.searchResults
            ? { results: cached.searchResults }
            : undefined,
          cached: true,
        };
      }

      // Get API key from config
      const apiKey = await ctx.runQuery(internal.lib.getApiKey);
      const client = new Supermemory({ apiKey });

      // Call Supermemory API
      const result = await client.profile({
        containerTag: args.containerTag,
        q: args.q,
      });

      const responseTime = Date.now() - startTime;

      // Cache profile (expires in 2 minutes for freshness)
      await ctx.runMutation(internal.mutations.cacheProfile, {
        containerTag: args.containerTag,
        staticProfile: result.profile.static,
        dynamicProfile: result.profile.dynamic,
        searchResults: result.searchResults?.results,
        ttl: 120, // 2 minutes
      });

      // Log API call
      await ctx.runMutation(internal.mutations.logApiCall, {
        endpoint: "profile",
        containerTag: args.containerTag,
        requestBody: args,
        responseStatus: "success",
        responseTime,
      });

      return {
        ...result,
        cached: false,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log error
      await ctx.runMutation(internal.mutations.logApiCall, {
        endpoint: "profile",
        containerTag: args.containerTag,
        requestBody: args,
        responseStatus: "error",
        responseTime,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
});
