/**
 * React Query hooks for supermemory API
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
	fetchProjects,
	getDefaultProject,
	getUserData,
	saveMemory,
	searchMemories,
	setDefaultProject,
} from "./api"
import type { MemoryPayload } from "./types"

// Query Keys
export const queryKeys = {
	projects: ["projects"] as const,
	defaultProject: ["defaultProject"] as const,
	userData: ["userData"] as const,
}

// Projects Query
export function useProjects(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: queryKeys.projects,
		queryFn: fetchProjects,
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled: options?.enabled ?? true,
	})
}

// Default Project Query
export function useDefaultProject(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: queryKeys.defaultProject,
		queryFn: getDefaultProject,
		staleTime: 2 * 60 * 1000, // 2 minutes
		enabled: options?.enabled ?? true,
	})
}

// User Data Query
export function useUserData(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: queryKeys.userData,
		queryFn: getUserData,
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled: options?.enabled ?? true,
	})
}

// Set Default Project Mutation
export function useSetDefaultProject() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: setDefaultProject,
		onSuccess: (_, project) => {
			queryClient.setQueryData(queryKeys.defaultProject, project)
		},
	})
}

// Save Memory Mutation
export function useSaveMemory() {
	return useMutation({
		mutationFn: (payload: MemoryPayload) => saveMemory(payload),
	})
}

// Search Memories Mutation
export function useSearchMemories() {
	return useMutation({
		mutationFn: (query: string) => searchMemories(query),
	})
}
