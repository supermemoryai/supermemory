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

	// Normalize empty selection to the default tag so the selector, counts, and
	// queries all agree (shared Team Brain for company-brain orgs).
	const normalizedProjects =
		selectedProjects.length === 0 ? [defaultTag] : selectedProjects

	const selectedProject = normalizedProjects[0]

	const effectiveContainerTags = normalizedProjects

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
		selectedProjects: normalizedProjects,
		selectedProject,
		setSelectedProjects,
		setSelectedProject,
		effectiveContainerTags,
	}
}

export { usePersistentChat, usePersistentChatStore } from "./chat"
