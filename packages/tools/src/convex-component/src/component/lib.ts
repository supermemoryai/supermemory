import { internalQuery } from "./_generated/server";

/**
 * Internal library functions
 *
 * Helper functions used internally by actions and mutations.
 */

/**
 * Get Supermemory API key from config
 * Used by actions to authenticate with Supermemory API
 */
export const getApiKey = internalQuery({
  args: {},
  handler: async (ctx): Promise<string> => {
    // Check Convex environment variable first
    const envApiKey = process.env.SUPERMEMORY_API_KEY;
    if (envApiKey) {
      return envApiKey;
    }

    // Fall back to database config
    const config = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", "SUPERMEMORY_API_KEY"))
      .first();

    if (config && config.value) {
      return config.value as string;
    }

    throw new Error(
      "Supermemory API key not configured. Set SUPERMEMORY_API_KEY environment variable with: npx convex env set SUPERMEMORY_API_KEY your-key"
    );
  },
});
