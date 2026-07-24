export type AgentContainerKind =
	| "canonical-project"
	| "personal"
	| "project"
	| "legacy-personal"
	| "legacy-project"

export type AgentSourceFilter = "claude-code" | "codex" | "opencode"

export const AGENT_SOURCE_FILTERS: ReadonlyArray<{
	value: AgentSourceFilter
	label: string
	sources: readonly string[]
}> = [
	{
		value: "claude-code",
		label: "Claude Code",
		sources: ["claude-code", "claude-code-plugin"],
	},
	{ value: "codex", label: "Codex", sources: ["codex"] },
	{ value: "opencode", label: "OpenCode", sources: ["opencode"] },
]

export type AgentSpaceMetadata = {
	projectName?: string
	projectId?: string
}

export type AgentSpaceGroup<T extends { containerTag: string }> = {
	key: string
	label: string
	projectName?: string
	kind: "project" | "legacy-personal"
	representative: T
	projects: T[]
	containerTags: string[]
}

const TAG_PATTERNS: Array<{
	kind: AgentContainerKind
	pattern: RegExp
}> = [
	{ kind: "canonical-project", pattern: /^repo_(.+)__([0-9a-f]{16})$/i },
	{ kind: "personal", pattern: /^user_project_([0-9a-f]{6,64})$/i },
	{ kind: "project", pattern: /^repo_(.+)$/i },
	{
		kind: "legacy-personal",
		pattern: /^codex_user_([0-9a-f]{6,64})$/i,
	},
	{
		kind: "legacy-personal",
		pattern: /^claudecode_project_([0-9a-f]{6,64})$/i,
	},
	{
		kind: "legacy-project",
		pattern: /^codex_project_([0-9a-f]{6,64})$/i,
	},
	{
		kind: "legacy-personal",
		pattern: /^opencode_user_([0-9a-f]{6,64})$/i,
	},
	{
		kind: "legacy-project",
		pattern: /^opencode_project_([0-9a-f]{6,64})$/i,
	},
]

function matchAgentTag(containerTag: string): {
	kind: AgentContainerKind
	id: string
	projectId?: string
	projectSlug?: string
} | null {
	for (const definition of TAG_PATTERNS) {
		const match = containerTag.match(definition.pattern)
		if (!match?.[1]) continue
		if (definition.kind === "canonical-project" && match[2]) {
			return {
				kind: definition.kind,
				id: match[2],
				projectId: match[2].toLowerCase(),
				projectSlug: match[1],
			}
		}
		return { kind: definition.kind, id: match[1] }
	}
	return null
}

export function getAgentContainerKind(
	containerTag: string,
): AgentContainerKind | null {
	return matchAgentTag(containerTag)?.kind ?? null
}

export function isAgentContainerTag(containerTag: string): boolean {
	return !!matchAgentTag(containerTag)
}

export function isAgentsSelection(containerTags: readonly string[]): boolean {
	return containerTags.length > 0 && containerTags.every(isAgentContainerTag)
}

export function agentSourceValues(
	filter: AgentSourceFilter | null | undefined,
): string[] | undefined {
	if (!filter) return undefined
	const definition = AGENT_SOURCE_FILTERS.find(
		(candidate) => candidate.value === filter,
	)
	return definition ? [...definition.sources] : undefined
}

function normalizeProjectName(value: string | undefined): string | undefined {
	const trimmed = value?.trim()
	return trimmed || undefined
}

function humanizeProjectId(value: string): string {
	return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
}

function tagPriority(containerTag: string): number {
	switch (getAgentContainerKind(containerTag)) {
		case "canonical-project":
			return 0
		case "personal":
			return 1
		case "legacy-personal":
			return containerTag.startsWith("claudecode_project_") ? 2 : 5
		case "project":
			return 3
		case "legacy-project":
			return 4
		default:
			return 5
	}
}

function legacyGroupIdentity(
	containerTag: string,
	projectName: string | undefined,
): { key: string; label: string; kind: AgentSpaceGroup<never>["kind"] } {
	const match = matchAgentTag(containerTag)
	if (!match) {
		return { key: `tag:${containerTag}`, label: containerTag, kind: "project" }
	}

	// Old Codex and OpenCode personal containers were intentionally global.
	// Even if the newest document has a project name, assigning the whole
	// container to that project would mix memories from historical projects.
	if (
		containerTag.startsWith("codex_user_") ||
		containerTag.startsWith("opencode_user_")
	) {
		const agent = containerTag.startsWith("codex_user_") ? "Codex" : "OpenCode"
		return {
			key: `legacy-personal:${containerTag}`,
			label: `Legacy ${agent} personal`,
			kind: "legacy-personal",
		}
	}

	if (projectName) {
		return {
			key: `project:${projectName.toLocaleLowerCase()}`,
			label: projectName,
			kind: "project",
		}
	}

	if (
		containerTag.startsWith("user_project_") ||
		containerTag.startsWith("claudecode_project_") ||
		containerTag.startsWith("codex_project_") ||
		containerTag.startsWith("opencode_project_")
	) {
		return {
			key: `path:${match.id.toLocaleLowerCase()}`,
			label: `Project · ${match.id.slice(0, 6)}`,
			kind: "project",
		}
	}

	return {
		key: `repo:${match.id.toLocaleLowerCase()}`,
		label: humanizeProjectId(match.id) || "Project",
		kind: "project",
	}
}

function normalizeProjectId(value: string | undefined): string | undefined {
	const normalized = value?.trim().toLowerCase()
	return normalized || undefined
}

function addProjectToGroup<T extends { containerTag: string }>(
	grouped: Map<string, AgentSpaceGroup<T>>,
	key: string,
	label: string,
	kind: AgentSpaceGroup<T>["kind"],
	project: T,
	projectName: string | undefined,
) {
	const existing = grouped.get(key)
	if (existing) {
		existing.projects.push(project)
		existing.containerTags.push(project.containerTag)
		if (!existing.projectName && projectName) {
			existing.projectName = projectName
			existing.label = projectName
		}
		return
	}

	grouped.set(key, {
		key,
		label,
		projectName,
		kind,
		representative: project,
		projects: [project],
		containerTags: [project.containerTag],
	})
}

/**
 * Collapse the physical Claude/Codex/OpenCode containers into one selectable
 * Agents row per project. Every returned container tag remains real; the UI
 * never writes to a synthetic "agents" tag.
 */
export function groupAgentSpaces<T extends { containerTag: string }>(
	projects: T[],
	metadata: ReadonlyMap<string, AgentSpaceMetadata>,
): AgentSpaceGroup<T>[] {
	const grouped = new Map<string, AgentSpaceGroup<T>>()
	const legacyProjects: Array<{
		project: T
		projectName: string | undefined
	}> = []
	const canonicalKeysByName = new Map<string, string[]>()

	for (const project of projects) {
		const match = matchAgentTag(project.containerTag)
		if (!match) continue
		const spaceMetadata = metadata.get(project.containerTag)
		const projectName = normalizeProjectName(spaceMetadata?.projectName)
		const projectId = normalizeProjectId(
			spaceMetadata?.projectId ?? match.projectId,
		)
		if (!projectId) {
			legacyProjects.push({ project, projectName })
			continue
		}

		const key = `project-id:${projectId}`
		const label =
			projectName || humanizeProjectId(match.projectSlug ?? "") || "Project"
		addProjectToGroup(grouped, key, label, "project", project, projectName)
		if (projectName) {
			const normalizedName = projectName.toLocaleLowerCase()
			const keys = canonicalKeysByName.get(normalizedName) ?? []
			if (!keys.includes(key)) keys.push(key)
			canonicalKeysByName.set(normalizedName, keys)
		}
	}

	for (const { project, projectName } of legacyProjects) {
		const identity = legacyGroupIdentity(project.containerTag, projectName)
		const canonicalMatches = projectName
			? (canonicalKeysByName.get(projectName.toLocaleLowerCase()) ?? [])
			: []
		const firstCanonical = canonicalMatches[0]
		const key =
			identity.kind === "project" &&
			canonicalMatches.length === 1 &&
			firstCanonical !== undefined
				? firstCanonical
				: identity.key
		addProjectToGroup(
			grouped,
			key,
			projectName ?? identity.label,
			identity.kind,
			project,
			projectName,
		)
	}

	return [...grouped.values()]
		.map((group) => {
			const orderedProjects = [...group.projects].sort(
				(a, b) =>
					tagPriority(a.containerTag) - tagPriority(b.containerTag) ||
					a.containerTag.localeCompare(b.containerTag),
			)
			return {
				...group,
				representative: orderedProjects[0] ?? group.representative,
				projects: orderedProjects,
				containerTags: orderedProjects.map((project) => project.containerTag),
			}
		})
		.sort((a, b) => {
			if (a.kind !== b.kind) return a.kind === "project" ? -1 : 1
			return a.label.localeCompare(b.label)
		})
}
