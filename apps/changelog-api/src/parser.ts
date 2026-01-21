export interface ChangelogItem {
	title: string
	description: string
}

export interface ChangelogEntry {
	date: string // "2025-12-30"
	dateFormatted: string // "December 30, 2025"
	items: ChangelogItem[]
}

export interface ChangelogResponse {
	title: string
	description: string
	lastUpdated: string // ISO date of most recent entry
	entries: ChangelogEntry[]
	total: number
}

function parseFrontmatter(content: string): {
	frontmatter: Record<string, string>
	body: string
} {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
	if (!frontmatterMatch) {
		return { frontmatter: {}, body: content }
	}

	const frontmatterStr = frontmatterMatch[1]
	const body = frontmatterMatch[2]

	const frontmatter: Record<string, string> = {}
	for (const line of frontmatterStr.split("\n")) {
		const match = line.match(/^(\w+):\s*"?([^"]*)"?$/)
		if (match) {
			frontmatter[match[1]] = match[2]
		}
	}

	return { frontmatter, body }
}

function parseDate(dateStr: string): { date: string; dateFormatted: string } {
	// Parse "December 30, 2025" format
	const months: Record<string, string> = {
		January: "01",
		February: "02",
		March: "03",
		April: "04",
		May: "05",
		June: "06",
		July: "07",
		August: "08",
		September: "09",
		October: "10",
		November: "11",
		December: "12",
	}

	const match = dateStr.match(/^(\w+)\s+(\d+),\s+(\d+)$/)
	if (!match) {
		return { date: "", dateFormatted: dateStr }
	}

	const [, month, day, year] = match
	const monthNum = months[month]
	if (!monthNum) {
		console.warn(`Unknown month "${month}" in date "${dateStr}", skipping entry`)
		return { date: "", dateFormatted: dateStr }
	}
	const paddedDay = day.padStart(2, "0")

	return {
		date: `${year}-${monthNum}-${paddedDay}`,
		dateFormatted: dateStr,
	}
}

function parseItems(content: string): ChangelogItem[] {
	const items: ChangelogItem[] = []

	// Match lines starting with "- **Title:** Description" or "- **Title** Description"
	const lines = content.split("\n")

	for (const line of lines) {
		const trimmed = line.trim()
		if (!trimmed.startsWith("- **")) continue

		// Match "- **Title:** Description" or "- **Title** Description"
		const match = trimmed.match(/^-\s+\*\*([^*]+)\*\*:?\s*(.*)$/)
		if (match) {
			// Remove trailing colon from title if present (e.g., "MCP Context Prompt:" -> "MCP Context Prompt")
			const title = match[1].trim().replace(/:$/, "")
			items.push({
				title,
				description: match[2].trim(),
			})
		}
	}

	return items
}

export function parseChangelog(content: string): ChangelogResponse {
	const { frontmatter, body } = parseFrontmatter(content)

	const entries: ChangelogEntry[] = []

	// Split by date headers (## Month Day, Year)
	const sections = body.split(/^##\s+/m).filter((s) => s.trim())

	for (const section of sections) {
		const lines = section.split("\n")
		const dateStr = lines[0].trim()

		// Skip if not a valid date header
		if (!dateStr.match(/^\w+\s+\d+,\s+\d+$/)) continue

		const { date, dateFormatted } = parseDate(dateStr)
		const items = parseItems(section)

		if (items.length > 0 && date) {
			entries.push({
				date,
				dateFormatted,
				items,
			})
		}
	}

	// Sort entries by date descending (most recent first)
	entries.sort((a, b) => b.date.localeCompare(a.date))

	const totalItems = entries.reduce((sum, entry) => sum + entry.items.length, 0)
	const lastUpdated = entries[0]?.date || ""

	return {
		title: frontmatter.title || "Changelog",
		description: frontmatter.description || "",
		lastUpdated,
		entries,
		total: totalItems,
	}
}
