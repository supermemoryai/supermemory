import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { typeDecider } from "~/components/memories/SharedCard";
import { Memory } from "~/lib/types/memory";

interface MemoriesResponse {
	items: Memory[];
	total: number;
}

interface CachedMemories {
	items: Memory[];
	total: number;
	nextCursor: number;
}

interface AddMemoryResponse {
	message: string;
	id: string;
	type: string;
}

export function useMemories(start = 0, count = 40, spaceId?: string) {
	const queryClient = useQueryClient();
	const cacheKey = ["memories", spaceId];

	const { data: memoriesData, isLoading: isInitialLoading } = useQuery<CachedMemories>({
		queryKey: cacheKey,
		queryFn: async () => {
			const url = new URL(`/backend/v1/memories`, window.location.origin);
			url.searchParams.set("start", "0");
			url.searchParams.set("count", count.toString());
			if (spaceId) url.searchParams.set("spaceId", spaceId);

			const response = await fetch(url.toString(), {
				credentials: "include",
			});
			if (!response.ok) throw new Error("Failed to fetch memories");

			const data = (await response.json()) as MemoriesResponse;

			return {
				items: data.items,
				total: data.total,
				nextCursor: data.items.length,
			};
		},
		staleTime: 1000 * 60 * 5, // Cache for 5 minutes
	});

	const fetchNextPage = useMutation({
		mutationFn: async () => {
			if (!memoriesData || memoriesData.nextCursor >= memoriesData.total) {
				return null;
			}

			const url = new URL(`/backend/v1/memories`, window.location.origin);
			url.searchParams.set("start", memoriesData.nextCursor.toString());
			url.searchParams.set("count", count.toString());
			if (spaceId) url.searchParams.set("spaceId", spaceId);

			const response = await fetch(url.toString(), {
				credentials: "include",
			});
			if (!response.ok) throw new Error("Failed to fetch next page");

			const data = (await response.json()) as MemoriesResponse;

			return data;
		},
		onSuccess: (data) => {
			if (!data) return;

			queryClient.setQueryData<CachedMemories>(cacheKey, (old) => {
				if (!old)
					return {
						items: data.items,
						total: data.total,
						nextCursor: data.items.length,
					};

				// Merge new items, avoiding duplicates
				const existingIds = new Set(old.items.map((item) => item.uuid));
				const newItems = data.items.filter((item) => !existingIds.has(item.uuid));

				return {
					items: [...old.items, ...newItems],
					total: data.total,
					nextCursor: old.nextCursor + newItems.length,
				};
			});
		},
	});

	const deleteMemory = useMutation({
		mutationFn: async (memoryId: string) => {
			const response = await fetch(`/backend/v1/memories/${memoryId}`, {
				method: "DELETE",
				credentials: "include",
			});
			if (!response.ok) throw new Error("Failed to delete memory");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["memories"] });
		},
		onError: (error: Error) => {
			toast.error(`Error deleting memory: ${error.message}`);
		},
	});

	const addMemory = useMutation({
		mutationFn: async ({ content, spaces }: { content: string; spaces: string[] }) => {
			const type = typeDecider(content);
			const optimisticMemory: Memory = {
				id: -1,
				content,
				type,
				createdAt: new Date(),
				description: null,
				ogImage: null,
				title: type === "note" ? content : null,
				url: type === "page" ? content : null,
				uuid: crypto.randomUUID(),
				updatedAt: null,
				raw: null,
				userId: 0,
				isSuccessfullyProcessed: false,
				errorMessage: null,
				contentHash: null,
			};

			queryClient.setQueryData<CachedMemories>(cacheKey, (old) => {
				if (!old)
					return {
						items: [optimisticMemory],
						total: 1,
						nextCursor: 1,
					};

				return {
					items: [optimisticMemory, ...old.items],
					total: old.total + 1,
					nextCursor: old.nextCursor + 1,
				};
			});

			const toastId = toast.loading("Adding content to your second brain...");

			try {
				const response = await fetch(`/backend/v1/add`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content, spaces }),
					credentials: "include",
				});

				if (!response.ok) {
					const errorText = await response.text();
					// Remove optimistic update on error
					queryClient.setQueryData<CachedMemories>(cacheKey, (old) => {
						if (!old) return { items: [], total: 0, nextCursor: 0 };
						return {
							items: old.items.filter((m) => m.id !== optimisticMemory.id),
							total: old.total - 1,
							nextCursor: old.nextCursor - 1,
						};
					});
					toast.error(errorText, { id: toastId, richColors: true });
					throw new Error(errorText);
				}

				const result = (await response.json()) as AddMemoryResponse;

				toast.loading("Content queued for processing...", { id: toastId });

				const pollForMemory = async (): Promise<Memory> => {
					const response = await fetch(`/backend/v1/memories/${result.id}`, {
						credentials: "include",
					});
					if (!response.ok) {
						console.error(await response.text());
						toast.error("Failed to fetch processed memory", { id: toastId });
						throw new Error("Failed to fetch processed memory");
					}
					return response.json();
				};

				let attempts = 0;
				const maxAttempts = 15;

				while (attempts < maxAttempts) {
					await new Promise((resolve) => setTimeout(resolve, 2000));
					try {
						const processedMemory = await pollForMemory();
						if (processedMemory.isSuccessfullyProcessed) {
							toast.success("Memory added successfully!", { id: toastId });
							queryClient.setQueryData<CachedMemories>(cacheKey, (old) => {
								if (!old)
									return {
										items: [processedMemory],
										total: 1,
										nextCursor: 1,
									};

								return {
									items: old.items.map((m) => (m.id === optimisticMemory.id ? processedMemory : m)),
									total: old.total,
									nextCursor: old.nextCursor,
								};
							});
							return processedMemory;
						}

						if (attempts % 2 === 0) {
							toast.loading("Visiting and reading the website...", { id: toastId });
						}
					} catch (error) {
						toast.error("Failed to fetch processed memory", { id: toastId });
						console.error("Error polling for memory:", error);
					}
					attempts++;
				}

				return optimisticMemory;
			} catch (error) {
				// Remove optimistic update on any error
				queryClient.setQueryData<CachedMemories>(cacheKey, (old) => {
					if (!old) return { items: [], total: 0, nextCursor: 0 };
					return {
						items: old.items.filter((m) => m.id !== optimisticMemory.id),
						total: old.total - 1,
						nextCursor: old.nextCursor - 1,
					};
				});
				throw error;
			}
		},
		onError: (error: Error) => {
			queryClient.invalidateQueries({ queryKey: ["memories"] });
		},
	});

	const wrappedAddMemory = async (params: { content: string; spaces: string[] }) => {
		return addMemory.mutateAsync(params);
	};

	const wrappedDeleteMemory = async (memoryId: string) => {
		const promise = deleteMemory.mutateAsync(memoryId);
		toast.promise(promise, {
			loading: "Deleting memory...",
			success: "Memory deleted successfully",
			error: (err) => `Failed to delete memory: ${err.message}`,
		});
		return promise;
	};

	return {
		memories: memoriesData?.items ?? [],
		isLoading: isInitialLoading, // Only show loading state for initial fetch, not for fetchNextPage
		loadMore: () => {
			if (
				!fetchNextPage.isPending &&
				memoriesData?.nextCursor &&
				memoriesData?.nextCursor < memoriesData?.total
			) {
				return fetchNextPage.mutateAsync();
			}
			return Promise.resolve();
		},
		hasMore: memoriesData ? memoriesData.nextCursor < memoriesData.total : false,
		total: memoriesData?.total ?? 0,
		addMemory: wrappedAddMemory,
	};
}
