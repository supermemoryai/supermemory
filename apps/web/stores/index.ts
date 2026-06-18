"use client"

import { useQueryState } from "nuqs"
import { projectParam } from "@/lib/search-params"
import { useCallback } from "react"
import { DEFAULT_PROJECT_ID, SHARED_TEAM_BRAIN_TAG } from "@lib/constants"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"

export function useProject() {
	const [selectedProjects, _setSelectedProjects] = useQueryState(
		"project",
		projectParam,
	)
	const hasCompanyBrain = useHasCompanyBrain()
	const defaultTag = hasCompanyBrain
		? SHARED_TEAM_BRAIN_TAG
		: DEFAULT_PROJECT_ID

	const selectedProject = selectedProjects[0] ?? defaultTag

	const effectiveContainerTags =
		selectedProjects.length === 0 ? [defaultTag] : selectedProjects

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
