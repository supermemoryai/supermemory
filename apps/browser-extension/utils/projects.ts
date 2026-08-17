import { CONTAINER_TAGS } from "./constants"
import type { Project } from "./types"

type ApiProject = Omit<Project, "name"> & {
	name?: string | null
}

const defaultProject: Project = {
	id: "default",
	name: "Default Project",
	containerTag: CONTAINER_TAGS.DEFAULT_PROJECT,
	createdAt: "",
	updatedAt: "",
	documentCount: 0,
}

export function normalizeProjects(
	projects: ApiProject[] | null | undefined,
): Project[] {
	const normalizedProjects = (Array.isArray(projects) ? projects : []).map(
		(project) => ({
			...project,
			name:
				project.name?.trim() ||
				(project.containerTag === CONTAINER_TAGS.DEFAULT_PROJECT
					? defaultProject.name
					: project.containerTag),
		}),
	)

	if (
		normalizedProjects.some(
			(project) => project.containerTag === CONTAINER_TAGS.DEFAULT_PROJECT,
		)
	) {
		return normalizedProjects
	}

	return [defaultProject, ...normalizedProjects]
}
