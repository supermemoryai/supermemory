"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { useProject } from "@/stores"

/**
 * Returns the display name of the currently selected project.
 * Falls back to the containerTag / id if a matching project record
 * hasn’t been fetched yet.
 */
export function useProjectName() {
	const { selectedProject } = useProject()
	const queryClient = useQueryClient()

	// This query is populated by ProjectsView – we just read from the cache.
	const projects = queryClient.getQueryData(["projects"]) as
		| Array<{ name: string; containerTag: string }>
		| undefined

	return useMemo(() => {
		if (selectedProject === "sm_project_default") return "Default Project"
		const found = projects?.find((p) => p.containerTag === selectedProject)
		return found?.name ?? selectedProject
	}, [projects, selectedProject])
}
