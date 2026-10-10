import type { NamespaceInfo } from "../shared/types"

const DEFAULT_DESCRIPTION_LIMIT = 160

const plural = (count: number, singular: string, pluralForm: string) =>
	`${count} ${count === 1 ? singular : pluralForm}`

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

export function spaceMetadata(space: NamespaceInfo): string {
	const lastActivity = formatActivityDate(space.updatedAt)
	const fields = [
		plural(space.documentCount, "document", "documents"),
		plural(space.memoryCount, "memory", "memories"),
		lastActivity ? `Last active ${lastActivity}` : undefined,
	]

	return fields.filter(Boolean).join(" · ")
}

export function formatSpaceRow(
	space: NamespaceInfo,
	activeKey: string,
	descriptionLimit = DEFAULT_DESCRIPTION_LIMIT,
): string {
	const active = space.namespace === activeKey ? " · Active" : ""
	const metadata = spaceMetadata(space)
	const description = compactDescription(space.description, descriptionLimit)
	const firstLine = `- ${space.namespace}${active}${metadata ? ` · ${metadata}` : ""}`

	return description ? `${firstLine}\n  ${description}` : firstLine
}

export function sortSpaces(
	spaces: NamespaceInfo[],
	activeKey: string,
): NamespaceInfo[] {
	return [...spaces].sort((left, right) => {
		if (left.namespace === activeKey) return -1
		if (right.namespace === activeKey) return 1
		return (
			new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
		)
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
