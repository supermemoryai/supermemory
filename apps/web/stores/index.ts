"use client"

import { useQueryState } from "nuqs"
import { projectParam } from "@/lib/search-params"
import { useCallback } from "react"

export function useProject() {
	const [selectedProject, _setSelectedProject] = useQueryState(
		"project",
		projectParam,
	)

	const setSelectedProject = useCallback(
		(projectId: string) => {
			_setSelectedProject(projectId)
		},
		[_setSelectedProject],
	)

	return { selectedProject, setSelectedProject }
}

export { usePersistentChat, usePersistentChatStore } from "./chat"
