"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { $fetch } from "@lib/api"
import type { ContainerTagListType } from "@lib/types"

export function useContainerTags() {
	const [enabled, setEnabled] = useState(false)

	useEffect(() => {
		const timeout = window.setTimeout(() => setEnabled(true), 900)
		return () => window.clearTimeout(timeout)
	}, [])

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
		enabled,
	})

	return {
		allProjects,
		isLoading: enabled && isLoading,
	}
}
