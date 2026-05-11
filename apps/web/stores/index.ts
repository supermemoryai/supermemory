"use client"

import { useQueryState } from "nuqs"
import { projectParam } from "@/lib/search-params"
import { useCallback } from "react"
import { DEFAULT_PROJECT_ID } from "@lib/constants"

export function useProject() {
	const [selectedProjects, _setSelectedProjects] = useQueryState(
		"project",
		projectParam,
	)

	const selectedProject = selectedProjects[0] ?? DEFAULT_PROJECT_ID

	const effectiveContainerTags =
		selectedProjects.length === 0 ? [DEFAULT_PROJECT_ID] : selectedProjects

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
		effectiveContainerTags,
	}
}

export { usePersistentChat, usePersistentChatStore } from "./chat"
