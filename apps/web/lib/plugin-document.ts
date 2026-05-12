import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

export type PluginDocumentKind =
	| "codex-session"
	| "codex-save"
	| "amp-thread"
	| "openclaw-session"

export interface PluginArtifact {
	label: string
	value: string
}

export interface PluginDocumentMessage {
	id: string
	role: "user" | "assistant" | "tool" | "system" | "unknown"
	text: string
}

export interface PluginDocumentSection {
	label: string
	value: string
	tone?: "default" | "accent" | "muted"
}

export interface ParsedPluginDocument {
	kind: PluginDocumentKind
	pluginLabel: string
	formatLabel: string
	title: string
	preview: string
	summary: string
	identifierLabel?: string
	identifierValue?: string
	clientLabel?: string
	clientValue?: string
	artifacts: PluginArtifact[]
	messages: PluginDocumentMessage[]
	sections: PluginDocumentSection[]
	rawContent: string
}

const TRANSCRIPT_ROLE_PATTERN = "user|assistant|tool|system"

function normalizeContent(content: string | null | undefined): string {
	if (!content) return ""

	return content
		.replace(/\r\n?/g, "\n")
		.replace(/\\n/g, "\n")
		.replace(/\u0000/g, "")
		.trim()
}

function formatClientName(value: string | null | undefined): string | null {
	if (!value) return null

	const trimmed = value.trim()
	if (!trimmed) return null

	const normalized = trimmed.replace(/[_-]+/g, " ")
	const lower = normalized.toLowerCase()

	if (lower === "codex") return "Codex"
	if (lower === "claude desktop") return "Claude Desktop"
	if (lower === "claude code") return "Claude Code"
	if (lower === "opencode") return "OpenCode"
	if (lower === "openclaw") return "OpenClaw"
	if (lower === "amp") return "Amp"

	return normalized.replace(/\b\w/g, (match) => match.toUpperCase())
}

function extractArtifacts(text: string): {
	cleanText: string
	artifacts: PluginArtifact[]
} {
	const artifacts: PluginArtifact[] = []
	const cleanLines: string[] = []

	for (const line of text.split("\n")) {
		const trimmed = line.trim()
		if (!trimmed) {
			cleanLines.push(line)
			continue
		}

		const memoryIdMatch = trimmed.match(/^memory id:\s*(.+)$/i)
		if (memoryIdMatch?.[1]) {
			artifacts.push({ label: "Memory ID", value: memoryIdMatch[1].trim() })
			continue
		}

		cleanLines.push(line)
	}

	return {
		cleanText: cleanLines.join("\n").trim(),
		artifacts,
	}
}

function parseTranscriptMessages(content: string): {
	messages: PluginDocumentMessage[]
	artifacts: PluginArtifact[]
} {
	const messages: PluginDocumentMessage[] = []
	const artifacts: PluginArtifact[] = []
	const regex = new RegExp(
		`^\\s*(\\d+)\\.\\s+\\[(${TRANSCRIPT_ROLE_PATTERN})\\]\\s*([\\s\\S]*?)(?=^\\s*\\d+\\.\\s+\\[(?:${TRANSCRIPT_ROLE_PATTERN})\\]\\s*|$)`,
		"gm",
	)

	let match: RegExpExecArray | null
	while ((match = regex.exec(content)) !== null) {
		const ordinal = match[1] ?? `${messages.length + 1}`
		const role = match[2] ?? "unknown"
		const rawText = match[3] ?? ""
		const { cleanText, artifacts: messageArtifacts } = extractArtifacts(
			rawText.trim(),
		)
		artifacts.push(...messageArtifacts)

		if (!cleanText) continue

		messages.push({
			id: `${ordinal}-${role}`,
			role: role as PluginDocumentMessage["role"],
			text: cleanText,
		})
	}

	return { messages, artifacts }
}

function parseRoleBlockMessages(content: string): {
	messages: PluginDocumentMessage[]
	artifacts: PluginArtifact[]
} {
	const messages: PluginDocumentMessage[] = []
	const artifacts: PluginArtifact[] = []
	const regex = /\[role:\s*(user|assistant|tool|system)\]\s*([\s\S]*?)\s*\[\1:end\]/gi

	let match: RegExpExecArray | null
	let index = 0
	while ((match = regex.exec(content)) !== null) {
		const role = match[1] ?? "unknown"
		const rawText = match[2] ?? ""
		const { cleanText, artifacts: messageArtifacts } = extractArtifacts(
			rawText.trim(),
		)
		artifacts.push(...messageArtifacts)

		if (!cleanText) continue

		messages.push({
			id: `${role}-${index}`,
			role: role.toLowerCase() as PluginDocumentMessage["role"],
			text: cleanText,
		})
		index++
	}

	return { messages, artifacts }
}

function takePreview(text: string, maxLength = 180): string {
	const normalized = text.replace(/\s+/g, " ").trim()
	if (!normalized) return ""
	if (normalized.length <= maxLength) return normalized
	return `${normalized.slice(0, maxLength - 1).trimEnd()}...`
}

function parseSaveSections(content: string): ParsedPluginDocument | null {
	const match = content.match(/\[SAVE:([^\]]+)\]([\s\S]*?)\[\/SAVE\]/i)
	if (!match) return null

	const savedAt = match[1] ?? ""
	const rawBody = match[2] ?? ""
	const sections: PluginDocumentSection[] = []
	const artifacts: PluginArtifact[] = []

	let overviewLines: string[] = []

	for (const line of rawBody.split("\n")) {
		const trimmed = line.trim()
		if (!trimmed) continue

		if (/^Decision:/i.test(trimmed)) {
			sections.push({
				label: "Decision",
				value: trimmed.replace(/^Decision:\s*/i, "").trim(),
				tone: "accent",
			})
			continue
		}

		if (/^Context:/i.test(trimmed)) {
			sections.push({
				label: "Context",
				value: trimmed.replace(/^Context:\s*/i, "").trim(),
				tone: "muted",
			})
			continue
		}

		if (/^Files:/i.test(trimmed)) {
			sections.push({
				label: "Files",
				value: trimmed.replace(/^Files:\s*/i, "").trim(),
				tone: "default",
			})
			continue
		}

		overviewLines.push(trimmed)
	}

	if (overviewLines.length > 0) {
		sections.unshift({
			label: "Summary",
			value: overviewLines.join("\n\n"),
		})
	}

	const summary =
		sections.find((section) => section.label === "Decision")?.value ??
		sections[0]?.value ??
		"Saved project note"

	return {
		kind: "codex-save",
		pluginLabel: "Codex",
		formatLabel: "Saved note",
		title: "Saved memory note",
		preview: takePreview(
			sections[0]?.value ?? "Saved project knowledge from Codex",
			140,
		),
		summary: takePreview(summary, 220),
		identifierLabel: "Saved",
		identifierValue: savedAt.trim(),
		artifacts,
		messages: [],
		sections,
		rawContent: content,
	}
}

function parseSessionTranscript(
	content: string,
	config: {
		kind: "codex-session" | "amp-thread"
		headerLabel: "Session" | "Amp thread"
		pluginLabel: string
		formatLabel: string
	}
): ParsedPluginDocument | null {
	const headerRegex = new RegExp(`\\[${config.headerLabel} ([^\\]]+)\\]`, "i")
	const headerMatch = content.match(headerRegex)
	if (!headerMatch?.[1]) return null

	const identifierValue = headerMatch[1].trim()
	const withoutHeader = content.replace(
		new RegExp(`\\[${config.headerLabel} [^\\]]+\\]\\s*`, "gi"),
		"",
	)
	const { messages, artifacts } = parseTranscriptMessages(withoutHeader)
	if (messages.length === 0) return null

	const userCount = messages.filter((message) => message.role === "user").length
	const assistantCount = messages.filter(
		(message) => message.role === "assistant",
	).length
	const previewSource =
		messages.find((message) => message.role === "user")?.text ??
		messages[0]?.text ??
		"Conversation"

	return {
		kind: config.kind,
		pluginLabel: config.pluginLabel,
		formatLabel: config.formatLabel,
		title: `${config.pluginLabel} conversation`,
		preview: takePreview(previewSource, 140),
		summary: `${userCount} user message${userCount === 1 ? "" : "s"} and ${assistantCount} assistant message${assistantCount === 1 ? "" : "s"} captured from ${config.pluginLabel}.`,
		identifierLabel: config.headerLabel,
		identifierValue,
		artifacts,
		messages,
		sections: [],
		rawContent: content,
	}
}

function parseOpenClawTranscript(content: string): ParsedPluginDocument | null {
	const { messages, artifacts } = parseRoleBlockMessages(content)
	if (messages.length === 0) return null

	const previewSource =
		messages.find((message) => message.role === "user")?.text ??
		messages[0]?.text ??
		"Conversation"

	return {
		kind: "openclaw-session",
		pluginLabel: "OpenClaw",
		formatLabel: "Conversation",
		title: "OpenClaw conversation",
		preview: takePreview(previewSource, 140),
		summary: `${messages.length} message${messages.length === 1 ? "" : "s"} captured from OpenClaw.`,
		artifacts,
		messages,
		sections: [],
		rawContent: content,
	}
}

export function parsePluginDocument(
	document: DocumentWithMemories | null,
): ParsedPluginDocument | null {
	if (!document?.content) return null

	const content = normalizeContent(document.content)
	if (!content) return null

	const metadata = (document.metadata ?? {}) as Record<string, unknown>
	const clientName = formatClientName(
		typeof metadata.sm_internal_mcp_client_name === "string"
			? metadata.sm_internal_mcp_client_name
			: null,
	)

	const codexSave = parseSaveSections(content)
	if (codexSave) {
		if (clientName) {
			codexSave.clientLabel = "Client"
			codexSave.clientValue = clientName
		}
		return codexSave
	}

	const codexSession = parseSessionTranscript(content, {
		kind: "codex-session",
		headerLabel: "Session",
		pluginLabel: "Codex",
		formatLabel: "Conversation",
	})
	if (codexSession) {
		if (clientName) {
			codexSession.clientLabel = "Client"
			codexSession.clientValue = clientName
		}
		return codexSession
	}

	const ampThread = parseSessionTranscript(content, {
		kind: "amp-thread",
		headerLabel: "Amp thread",
		pluginLabel: "Amp",
		formatLabel: "Conversation",
	})
	if (ampThread) return ampThread

	const openClawSession = parseOpenClawTranscript(content)
	if (openClawSession) return openClawSession

	return null
}
