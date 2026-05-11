import { DEFAULT_PROJECT_ID } from "@lib/constants"
import type { ContainerTagListType } from "@lib/types"
import { spaceSelectorDisplayName } from "@/lib/ingest-auto-space"

/** Label for the space sent as chat `metadata.projectId` (container tag). */
export function getChatSpaceDisplayLabel(options: {
	selectedProject: string
	allProjects: ContainerTagListType[]
}): string {
	const { selectedProject, allProjects } = options
	if (selectedProject === DEFAULT_PROJECT_ID) {
		return "My Space"
	}
	const found = allProjects.find((p) => p.containerTag === selectedProject)
	return spaceSelectorDisplayName(found, selectedProject)
}
