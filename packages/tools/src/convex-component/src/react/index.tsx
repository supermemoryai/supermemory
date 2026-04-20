import { useAction, useQuery, useMutation } from "convex/react";
import { useState, useCallback } from "react";
import type { FunctionReference } from "convex/server";
import type {
  AddMemoryArgs,
  SearchMemoriesArgs,
  ProfileArgs,
  SearchResponse,
  ProfileResponse,
  Document,
  ApiLog,
  ApiStats,
} from "../client/index";

/**
 * React Hooks for Supermemory Convex Component
 *
 * These hooks provide reactive access to Supermemory data with automatic
 * re-rendering when data changes.
 */

/**
 * Hook to add memories to Supermemory
 *
 * @param componentPath - Path to the component (default: "supermemory")
 *
 * @example
 * ```tsx
 * function ChatApp() {
 *   const addMemory = useAddMemory();
 *
 *   const handleSend = async (message: string) => {
 *     await addMemory({
 *       content: message,
 *       containerTag: userId
 *     });
 *   };
 * }
 * ```
 */
export function useAddMemory(componentPath: string = "supermemory") {
  const action = `${componentPath}:add` as unknown as FunctionReference<"action">;
  const addAction = useAction(action);

  return useCallback(
    async (args: AddMemoryArgs) => {
      return await addAction(args);
    },
    [addAction]
  );
}

/**
 * Hook to search Supermemory with reactive results
 *
 * @param args - Search arguments
 * @param componentPath - Path to the component (default: "supermemory")
 *
 * @example
 * ```tsx
 * function SearchResults({ query, userId }) {
 *   const { results, isLoading, error, search } = useSupermemorySearch({
 *     q: query,
 *     containerTag: userId,
 *     searchMode: "hybrid"
 *   });
 *
 *   if (isLoading) return <div>Searching...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {results?.results.map(r => (
 *         <div key={r.id}>{r.memory || r.chunk}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSupermemorySearch(
  args: SearchMemoriesArgs | null,
  componentPath: string = "supermemory"
) {
  const action = `${componentPath}:search` as unknown as FunctionReference<"action">;
  const searchAction = useAction(action);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(
    async (searchArgs?: SearchMemoriesArgs) => {
      const finalArgs = searchArgs || args;
      if (!finalArgs) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await searchAction(finalArgs);
        setResults(response as SearchResponse);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Search failed"));
      } finally {
        setIsLoading(false);
      }
    },
    [searchAction, args]
  );

  return {
    results,
    isLoading,
    error,
    search,
  };
}

/**
 * Hook to get user profile with reactive updates
 *
 * @param args - Profile arguments
 * @param componentPath - Path to the component (default: "supermemory")
 *
 * @example
 * ```tsx
 * function UserContext({ userId }) {
 *   const { profile, isLoading, refresh } = useSupermemoryProfile({
 *     containerTag: userId,
 *     q: "recent preferences"
 *   });
 *
 *   if (!profile) return null;
 *
 *   return (
 *     <div>
 *       <h3>Static Facts</h3>
 *       {profile.profile.static.map(fact => <p>{fact}</p>)}
 *
 *       <h3>Dynamic Context</h3>
 *       {profile.profile.dynamic.map(fact => <p>{fact}</p>)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSupermemoryProfile(
  args: ProfileArgs | null,
  componentPath: string = "supermemory"
) {
  const action = `${componentPath}:profile` as unknown as FunctionReference<"action">;
  const profileAction = useAction(action);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(
    async (profileArgs?: ProfileArgs) => {
      const finalArgs = profileArgs || args;
      if (!finalArgs) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await profileAction(finalArgs);
        setProfile(response as ProfileResponse);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Profile fetch failed"));
      } finally {
        setIsLoading(false);
      }
    },
    [profileAction, args]
  );

  return {
    profile,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook to list documents reactively
 *
 * @param args - List arguments
 * @param componentPath - Path to the component (default: "supermemory")
 *
 * @example
 * ```tsx
 * function DocumentList({ userId }) {
 *   const documents = useDocumentList({ containerTag: userId, limit: 20 });
 *
 *   return (
 *     <div>
 *       {documents?.map(doc => (
 *         <div key={doc._id}>
 *           <p>{doc.contentPreview}</p>
 *           <span>Status: {doc.status}</span>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDocumentList(
  args?: { containerTag?: string; limit?: number },
  componentPath: string = "supermemory"
) {
  const query = `${componentPath}:listDocuments` as unknown as FunctionReference<"query">;
  return useQuery(query, args || {}) as Document[] | undefined;
}

/**
 * Hook to get a document by custom ID
 *
 * @param customId - Custom document identifier
 * @param componentPath - Path to the component (default: "supermemory")
 */
export function useDocument(
  customId: string | null,
  componentPath: string = "supermemory"
) {
  const query =
    `${componentPath}:getDocumentByCustomId` as unknown as FunctionReference<"query">;
  return useQuery(
    query,
    customId ? { customId } : "skip"
  ) as Document | null | undefined;
}

/**
 * Hook to get API logs reactively
 *
 * @param args - Filter arguments
 * @param componentPath - Path to the component (default: "supermemory")
 *
 * @example
 * ```tsx
 * function ApiLogs() {
 *   const logs = useApiLogs({ limit: 50 });
 *
 *   return (
 *     <div>
 *       {logs?.map(log => (
 *         <div key={log._id}>
 *           {log.endpoint} - {log.responseStatus} ({log.responseTime}ms)
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useApiLogs(
  args?: { endpoint?: string; containerTag?: string; limit?: number },
  componentPath: string = "supermemory"
) {
  const query = `${componentPath}:getApiLogs` as unknown as FunctionReference<"query">;
  return useQuery(query, args || {}) as ApiLog[] | undefined;
}

/**
 * Hook to get API statistics reactively
 *
 * @param args - Filter arguments
 * @param componentPath - Path to the component (default: "supermemory")
 *
 * @example
 * ```tsx
 * function Dashboard({ userId }) {
 *   const stats = useApiStats({ containerTag: userId });
 *
 *   return (
 *     <div>
 *       <p>Total Calls: {stats?.totalCalls}</p>
 *       <p>Success Rate: {((stats?.successfulCalls / stats?.totalCalls) * 100).toFixed(1)}%</p>
 *       <p>Avg Response: {stats?.averageResponseTime.toFixed(0)}ms</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useApiStats(
  args?: { containerTag?: string },
  componentPath: string = "supermemory"
) {
  const query = `${componentPath}:getApiStats` as unknown as FunctionReference<"query">;
  return useQuery(query, args || {}) as ApiStats | undefined;
}

/**
 * Hook to clean expired cache
 *
 * @param componentPath - Path to the component (default: "supermemory")
 */
export function useCleanCache(componentPath: string = "supermemory") {
  const mutation =
    `${componentPath}:cleanExpiredCache` as unknown as FunctionReference<"mutation">;
  const cleanMutation = useMutation(mutation);

  return useCallback(async () => {
    return await cleanMutation({});
  }, [cleanMutation]);
}

/**
 * Hook to update document status
 *
 * @param componentPath - Path to the component (default: "supermemory")
 */
export function useUpdateDocumentStatus(componentPath: string = "supermemory") {
  const mutation =
    `${componentPath}:updateDocumentStatus` as unknown as FunctionReference<"mutation">;
  const updateMutation = useMutation(mutation);

  return useCallback(
    async (args: { documentId: string; status: "queued" | "processed" | "failed" }) => {
      return await updateMutation(args);
    },
    [updateMutation]
  );
}

/**
 * Hook to set Supermemory API key
 *
 * @param componentPath - Path to the component (default: "supermemory")
 */
export function useSetApiKey(componentPath: string = "supermemory") {
  const mutation = `${componentPath}:setApiKey` as unknown as FunctionReference<"mutation">;
  const setKeyMutation = useMutation(mutation);

  return useCallback(
    async (apiKey: string) => {
      return await setKeyMutation({ apiKey });
    },
    [setKeyMutation]
  );
}

// Export all types
export type {
  AddMemoryArgs,
  SearchMemoriesArgs,
  ProfileArgs,
  SearchResponse,
  ProfileResponse,
  Document,
  ApiLog,
  ApiStats,
} from "../client/index";
