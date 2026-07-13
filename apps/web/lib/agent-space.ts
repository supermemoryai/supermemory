export type AgentContainerKind =
	| "personal"
	| "project"
	| "legacy-personal"
	| "legacy-project"

export type AgentSourceFilter = "claude-code" | "codex"

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
]

export type AgentSpaceMetadata = {
	projectName?: string
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
]

function matchAgentTag(containerTag: string): {
	kind: AgentContainerKind
	id: string
} | null {
	for (const definition of TAG_PATTERNS) {
		const match = containerTag.match(definition.pattern)
		if (match?.[1]) return { kind: definition.kind, id: match[1] }
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
		case "personal":
			return 0
		case "legacy-personal":
			return containerTag.startsWith("claudecode_project_") ? 1 : 4
		case "project":
			return 2
		case "legacy-project":
			return 3
		default:
			return 5
	}
}

function groupIdentity(
	containerTag: string,
	projectName: string | undefined,
): { key: string; label: string; kind: AgentSpaceGroup<never>["kind"] } {
	const match = matchAgentTag(containerTag)
	if (!match) {
		return { key: `tag:${containerTag}`, label: containerTag, kind: "project" }
	}

	// Old Codex personal memory was intentionally global. Even if its newest
	// document contains a project name, assigning the whole container to that
	// project would leak memories from its other historical projects.
	if (containerTag.startsWith("codex_user_")) {
		return {
			key: `legacy-personal:${containerTag}`,
			label: "Legacy Codex personal",
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
		containerTag.startsWith("codex_project_")
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

/**
 * Collapse the physical Claude/Codex containers into one selectable Agents row
 * per project. Every returned container tag remains real; the UI never writes
 * to a synthetic "agents" tag.
 */
export function groupAgentSpaces<T extends { containerTag: string }>(
	projects: T[],
	metadata: ReadonlyMap<string, AgentSpaceMetadata>,
): AgentSpaceGroup<T>[] {
	const grouped = new Map<string, AgentSpaceGroup<T>>()

	for (const project of projects) {
		if (!isAgentContainerTag(project.containerTag)) continue
		const projectName = normalizeProjectName(
			metadata.get(project.containerTag)?.projectName,
		)
		const identity = groupIdentity(project.containerTag, projectName)
		const existing = grouped.get(identity.key)
		if (existing) {
			existing.projects.push(project)
			existing.containerTags.push(project.containerTag)
			if (!existing.projectName && projectName) {
				existing.projectName = projectName
				existing.label = projectName
			}
			continue
		}

		grouped.set(identity.key, {
			key: identity.key,
			label: identity.label,
			projectName,
			kind: identity.kind,
			representative: project,
			projects: [project],
			containerTags: [project.containerTag],
		})
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
