import type { ContainerTag } from "../shared/types"

const DEFAULT_DESCRIPTION_LIMIT = 160

const plural = (count: number, singular: string, pluralForm: string) =>
	`${count} ${count === 1 ? singular : pluralForm}`

export function workspaceDisplayName(
	workspace: ContainerTag | undefined,
	key: string,
): string {
	return workspace?.name || key
}

export function compactDescription(
	description: string | null | undefined,
	limit = DEFAULT_DESCRIPTION_LIMIT,
): string | undefined {
	const compact = description?.replace(/\s+/g, " ").trim()
	if (!compact) return undefined
	if (compact.length <= limit) return compact
	const candidate = compact.slice(0, Math.max(0, limit - 3)).trimEnd()
	const lastSpace = candidate.lastIndexOf(" ")
	const boundary =
		lastSpace >= Math.floor(limit * 0.6) ? lastSpace : candidate.length
	return `${candidate.slice(0, boundary)}...`
}

export function formatActivityDate(value: string | null): string | undefined {
	if (!value) return undefined
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return undefined

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	}).format(date)
}

export function workspaceMetadata(workspace: ContainerTag): string {
	const lastActivity = formatActivityDate(workspace.lastActivityAt)
	const fields = [
		workspace.visibility
			? `${workspace.visibility.charAt(0).toUpperCase()}${workspace.visibility.slice(1)}`
			: undefined,
		plural(workspace.documentCount, "document", "documents"),
		plural(workspace.memoryCount, "memory", "memories"),
		lastActivity ? `Last active ${lastActivity}` : undefined,
	]

	return fields.filter(Boolean).join(" · ")
}

export function formatWorkspaceRow(
	workspace: ContainerTag,
	activeKey: string,
	descriptionLimit = DEFAULT_DESCRIPTION_LIMIT,
): string {
	const active = workspace.containerTag === activeKey ? " · Active" : ""
	const metadata = workspaceMetadata(workspace)
	const description = compactDescription(
		workspace.description,
		descriptionLimit,
	)
	const firstLine =
		`- ${workspaceDisplayName(workspace, workspace.containerTag)} ` +
		`[${workspace.containerTag}]${active}${metadata ? ` · ${metadata}` : ""}`

	return description ? `${firstLine}\n  ${description}` : firstLine
}

export function sortWorkspaces(
	workspaces: ContainerTag[],
	activeKey: string,
): ContainerTag[] {
	return [...workspaces].sort((left, right) => {
		if (left.containerTag === activeKey) return -1
		if (right.containerTag === activeKey) return 1

		const leftTime = left.lastActivityAt
			? new Date(left.lastActivityAt).getTime()
			: 0
		const rightTime = right.lastActivityAt
			? new Date(right.lastActivityAt).getTime()
			: 0
		return rightTime - leftTime
	})
}

export function formatFactSection(
	title: string,
	facts: string[],
	limit: number,
): string[] {
	if (facts.length === 0) return []

	const shown = facts.slice(0, limit)
	const lines = [`## ${title}`, ...shown.map((fact) => `- ${fact}`)]
	const remaining = facts.length - shown.length
	if (remaining > 0) lines.push(`- +${remaining} more`)
	return lines
}
