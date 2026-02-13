"use client"

import { useQueryState } from "nuqs"
import { projectParam } from "@/lib/search-params"
import { useCallback, useMemo } from "react"
import { DEFAULT_PROJECT_ID } from "@repo/lib/constants"
import { useContainerTags } from "@/hooks/use-container-tags"

export function useProject() {
	const [selectedProjects, _setSelectedProjects] = useQueryState(
		"project",
		projectParam,
	)
	const { novaContainerTags } = useContainerTags()

	const isNovaSpaces = selectedProjects.length === 0

	const selectedProject = isNovaSpaces
		? DEFAULT_PROJECT_ID
		: (selectedProjects[0] ?? DEFAULT_PROJECT_ID)

	// Get effective container tags for API calls
	// When "Nova Spaces" is selected, use all nova container tags
	// Otherwise, use the selected projects
	const effectiveContainerTags = useMemo(
		() => (isNovaSpaces ? novaContainerTags : selectedProjects),
		[isNovaSpaces, novaContainerTags, selectedProjects],
	)

	const setSelectedProjects = useCallback(
		(projects: string[]) => {
			_setSelectedProjects(projects.length === 0 ? null : projects)
		},
		[_setSelectedProjects],
	)

	const setSelectedProject = useCallback(
		(projectId: string) => {
			_setSelectedProjects([projectId])
		},
		[_setSelectedProjects],
	)

	return {
		selectedProjects,
		selectedProject,
		setSelectedProjects,
		setSelectedProject,
		isNovaSpaces,
		effectiveContainerTags,
		novaContainerTags,
	}
}

export { usePersistentChat, usePersistentChatStore } from "./chat"
