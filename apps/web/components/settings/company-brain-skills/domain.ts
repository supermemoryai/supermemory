export const SKILL_DESCRIPTION_MAX_LENGTH = 1024
export const SKILL_BODY_MAX_LENGTH = 16 * 1024

export type SkillScope = "personal" | "org"

export type SkillDraft = {
	name: string
	description: string
	body: string
	scope: SkillScope
}

export type SkillMarkdown = Pick<SkillDraft, "name" | "description" | "body">
export type NewSkillOrigin = "web" | "upload"

export type SkillAuthoringTarget = {
	canEdit: boolean
	creatorUserId: string
	scope: SkillScope
}

export function canSelectSkillScope(
	skill: SkillAuthoringTarget | null,
	viewerId: string,
	isAdmin: boolean,
	targetScope: SkillScope,
): boolean {
	if (!skill) return targetScope === "personal" || isAdmin

	const isCreator = skill.creatorUserId === viewerId
	if (targetScope === skill.scope) return skill.canEdit
	return skill.canEdit && isAdmin && isCreator
}

export function skillDraftForRole(
	draft: SkillDraft,
	isAdmin: boolean,
): SkillDraft {
	return isAdmin || draft.scope === "personal"
		? draft
		: { ...draft, scope: "personal" }
}

export function emptySkillDraft(): SkillDraft {
	return {
		name: "",
		description: "",
		body: "",
		scope: "personal",
	}
}

export function setSkillDraftScope(
	draft: SkillDraft,
	scope: SkillScope,
): SkillDraft {
	return {
		...draft,
		scope,
	}
}

export function normalizeSkillDraft(draft: SkillDraft): SkillDraft {
	return {
		name: draft.name.trim(),
		description: draft.description.trim(),
		body: draft.body.trim(),
		scope: draft.scope,
	}
}

export function skillDraftsEqual(left: SkillDraft, right: SkillDraft): boolean {
	const normalizedLeft = normalizeSkillDraft(left)
	const normalizedRight = normalizeSkillDraft(right)
	return (
		normalizedLeft.name === normalizedRight.name &&
		normalizedLeft.description === normalizedRight.description &&
		normalizedLeft.body === normalizedRight.body &&
		normalizedLeft.scope === normalizedRight.scope
	)
}

export function skillDraftPayload(draft: SkillDraft): SkillDraft {
	const normalized = normalizeSkillDraft(draft)
	const { name, description, body } = normalized

	if (!name) throw new Error("Give the skill a name.")
	if (!description) throw new Error("Add a short description.")
	if (description.length > SKILL_DESCRIPTION_MAX_LENGTH) {
		throw new Error(
			`Keep the description to ${SKILL_DESCRIPTION_MAX_LENGTH} characters.`,
		)
	}
	if (!body) throw new Error("Add the skill instructions.")
	if (new TextEncoder().encode(body).length > SKILL_BODY_MAX_LENGTH) {
		throw new Error("Keep the skill instructions under 16 KB.")
	}
	return normalized
}

export function skillSaveRequestBody(
	draft: SkillDraft,
	id: string | null,
	createOrigin?: NewSkillOrigin,
	expectedVersion?: number,
): SkillDraft & { origin?: "upload"; expectedVersion?: number } {
	if (id !== null) {
		if (!Number.isInteger(expectedVersion) || (expectedVersion ?? 0) < 1) {
			throw new Error("Refresh this skill before saving your changes.")
		}
		return { ...draft, expectedVersion }
	}
	return createOrigin === "upload" ? { ...draft, origin: "upload" } : draft
}

function parseQuotedScalar(value: string, key: string): string {
	if (value.startsWith('"')) {
		let closingQuote = -1
		let escaped = false
		for (let index = 1; index < value.length; index += 1) {
			const character = value[index]
			if (character === '"' && !escaped) {
				closingQuote = index
				break
			}
			escaped = character === "\\" ? !escaped : false
		}
		if (closingQuote < 0) {
			throw new Error(`Invalid quoted ${key} in skill frontmatter.`)
		}
		const suffix = value.slice(closingQuote + 1).trim()
		if (suffix && !suffix.startsWith("#")) {
			throw new Error(`Invalid quoted ${key} in skill frontmatter.`)
		}
		try {
			const parsed = JSON.parse(value.slice(0, closingQuote + 1)) as unknown
			if (typeof parsed !== "string") throw new Error("not a string")
			return parsed
		} catch {
			throw new Error(`Invalid quoted ${key} in skill frontmatter.`)
		}
	}
	if (value.startsWith("'")) {
		let parsed = ""
		for (let index = 1; index < value.length; index += 1) {
			const character = value[index]
			if (character !== "'") {
				parsed += character
				continue
			}
			if (value[index + 1] === "'") {
				parsed += "'"
				index += 1
				continue
			}
			const suffix = value.slice(index + 1).trim()
			if (suffix && !suffix.startsWith("#")) {
				throw new Error(`Invalid quoted ${key} in skill frontmatter.`)
			}
			return parsed
		}
		throw new Error(`Invalid quoted ${key} in skill frontmatter.`)
	}
	return value.replace(/\s+#.*$/, "").trimEnd()
}

function parseFrontmatter(source: string): {
	attributes: Record<string, string>
	body: string
} {
	const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n")
	const lines = normalized.split("\n")
	if (lines[0]?.trim() !== "---") {
		throw new Error("Skill files must start with YAML frontmatter.")
	}

	const end = lines.findIndex(
		(line, index) => index > 0 && /^---[\t ]*$/.test(line),
	)
	if (end < 0) throw new Error("Skill frontmatter is missing its closing ---.")

	const attributes: Record<string, string> = {}
	for (let index = 1; index < end; index += 1) {
		const line = lines[index] ?? ""
		if (!line.trim() || line.trimStart().startsWith("#")) continue
		// Extra SKILL.md metadata may contain nested maps/lists. Only name and
		// description are used here, so valid indented metadata can be ignored.
		if (/^\s/.test(line)) continue
		const match = /^([A-Za-z][\w-]*):(?:\s*(.*))?$/.exec(line)
		if (!match) throw new Error("Skill frontmatter is malformed.")
		const key = match[1]?.toLowerCase()
		let rawValue = match[2] ?? ""
		if (!key) throw new Error("Skill frontmatter is malformed.")
		if (attributes[key] !== undefined) {
			throw new Error(`Skill frontmatter contains duplicate ${key} fields.`)
		}

		if ([">", "|", ">-", "|-"].includes(rawValue)) {
			const blockLines: string[] = []
			while (index + 1 < end) {
				const next = lines[index + 1] ?? ""
				if (next && !/^\s/.test(next)) break
				index += 1
				blockLines.push(next.replace(/^\s{1,2}/, ""))
			}
			rawValue = rawValue.startsWith(">")
				? blockLines.join(" ").replace(/\s+/g, " ").trim()
				: blockLines.join("\n")
		}

		attributes[key] = parseQuotedScalar(rawValue.trim(), key)
	}

	return { attributes, body: lines.slice(end + 1).join("\n") }
}

export function parseSkillMarkdown(source: string): SkillMarkdown {
	const { attributes, body } = parseFrontmatter(source)
	const name = attributes.name?.trim() ?? ""
	const description = attributes.description?.trim() ?? ""
	if (!name) throw new Error("Skill frontmatter needs a name.")
	if (!description) throw new Error("Skill frontmatter needs a description.")
	if (description.length > SKILL_DESCRIPTION_MAX_LENGTH) {
		throw new Error(
			`Keep the description to ${SKILL_DESCRIPTION_MAX_LENGTH} characters.`,
		)
	}
	return { name, description, body }
}

export function serializeSkillMarkdown(skill: SkillMarkdown): string {
	return [
		"---",
		`name: ${JSON.stringify(skill.name)}`,
		`description: ${JSON.stringify(skill.description)}`,
		"---",
		skill.body,
	].join("\n")
}
