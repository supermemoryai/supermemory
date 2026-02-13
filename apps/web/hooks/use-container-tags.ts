"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { $fetch } from "@repo/lib/api"
import type { ContainerTagListType } from "@repo/lib/types"

export function useContainerTags() {
	const { data: allProjects = [], isLoading } = useQuery({
		queryKey: ["container-tags"],
		queryFn: async () => {
			const response = await $fetch("@get/container-tags/list")
			if (response.error) {
				throw new Error(response.error?.message || "Failed to load projects")
			}
			return (response.data || []) as ContainerTagListType[]
		},
		staleTime: 30 * 1000,
	})

	const novaProjects = useMemo(
		() => allProjects.filter((p) => p.isNova),
		[allProjects],
	)

	const novaContainerTags = useMemo(
		() => novaProjects.map((p) => p.containerTag),
		[novaProjects],
	)

	return {
		allProjects,
		novaProjects,
		novaContainerTags,
		isLoading,
	}
}
