"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { $fetch } from "@lib/api"

export type SpaceSettings = {
	containerTag: string
	name: string | null
	entityContext: string | null
}

export const spaceSettingsKey = (containerTag: string) =>
	["container-tag-settings", containerTag] as const

export async function fetchSpaceSettings(
	containerTag: string,
): Promise<SpaceSettings | null> {
	const response = await $fetch(`@get/container-tags/${containerTag}`, {
		disableValidation: true,
	})
	if (response.error) {
		throw new Error(response.error?.message || "Failed to load space settings")
	}
	const data = response.data as Partial<SpaceSettings> | null
	if (!data) return null
	return {
		containerTag,
		name: data.name ?? null,
		entityContext: data.entityContext ?? null,
	}
}

export function useSpaceContext(containerTag: string, enabled = true) {
	return useQuery({
		queryKey: spaceSettingsKey(containerTag),
		queryFn: () => fetchSpaceSettings(containerTag),
		enabled: enabled && !!containerTag,
		staleTime: 60 * 1000,
	})
}

export function useUpdateSpace() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			containerTag,
			name,
			entityContext,
		}: {
			containerTag: string
			name?: string
			entityContext?: string | null
		}) => {
			const body: { name?: string; entityContext?: string | null } = {}
			if (name !== undefined) body.name = name
			if (entityContext !== undefined) body.entityContext = entityContext
			const response = await $fetch(`@patch/container-tags/${containerTag}`, {
				body,
			})
			if (response.error) {
				throw new Error(response.error?.message || "Failed to save space")
			}
			return response.data
		},
		onSuccess: (_data, { containerTag }) => {
			queryClient.invalidateQueries({
				queryKey: spaceSettingsKey(containerTag),
			})
			queryClient.invalidateQueries({ queryKey: ["container-tags"] })
			toast.success("Space updated")
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to save space",
			)
		},
	})
}

export function useUpdateSpaceContext() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			containerTag,
			entityContext,
		}: {
			containerTag: string
			entityContext: string | null
		}) => {
			const response = await $fetch(`@patch/container-tags/${containerTag}`, {
				body: { entityContext },
			})
			if (response.error) {
				throw new Error(
					response.error?.message || "Failed to save space context",
				)
			}
			return response.data
		},
		onSuccess: (_data, { containerTag }) => {
			queryClient.invalidateQueries({
				queryKey: spaceSettingsKey(containerTag),
			})
			toast.success("Space context saved")
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to save space context",
			)
		},
	})
}
