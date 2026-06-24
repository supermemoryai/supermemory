"use client"

import { Bot, Code2, Terminal, type LucideIcon } from "lucide-react"
import type { DesktopToolId, DesktopToolStatus } from "@/lib/tools"

export type DesktopToolCatalogEntry = {
	id: DesktopToolId
	catalogId: "claude_code" | "codex" | "cursor"
	name: string
	tagline: string
	description: string
	docsUrl: string
	icon: LucideIcon
	perks: string[]
	restartHint: string
}

export type DesktopToolCard = DesktopToolCatalogEntry &
	DesktopToolStatus & {
		primaryAction: "connect" | "set-up" | "connected"
	}

export const DESKTOP_TOOL_CATALOG: Record<
	DesktopToolId,
	DesktopToolCatalogEntry
> = {
	"claude-code": {
		id: "claude-code",
		catalogId: "claude_code",
		name: "Claude Code",
		tagline: "Remembers your conventions, decisions, and project context",
		description:
			"Connect the Supermemory MCP server so Claude Code can search and save memories while you work.",
		docsUrl: "https://supermemory.ai/docs/integrations/claude-code",
		icon: Bot,
		perks: [
			"Search and save memories from coding sessions",
			"Project decisions become reusable context",
			"Backs up config before every change",
		],
		restartHint: "Restart Claude Code after changing MCP config.",
	},
	codex: {
		id: "codex",
		catalogId: "codex",
		name: "Codex",
		tagline: "Persistent memory for the Codex CLI",
		description:
			"Add Supermemory to Codex MCP servers so coding sessions can recall durable context.",
		docsUrl: "https://supermemory.ai/docs/integrations/codex",
		icon: Terminal,
		perks: [
			"Persistent memory for Codex CLI sessions",
			"Uses the Supermemory MCP server",
			"Backs up ~/.codex/config.toml first",
		],
		restartHint: "Restart Codex after changing ~/.codex/config.toml.",
	},
	cursor: {
		id: "cursor",
		catalogId: "cursor",
		name: "Cursor",
		tagline: "Persistent memory, session hooks, and MCP tools inside Cursor",
		description:
			"Write the Supermemory MCP server into Cursor's MCP config for one-click memory access.",
		docsUrl: "https://supermemory.ai/docs/supermemory-mcp/setup",
		icon: Code2,
		perks: [
			"Memory tools directly inside Cursor",
			"One MCP config for project context",
			"Backs up config before every change",
		],
		restartHint: "Restart Cursor so MCP changes are loaded.",
	},
}

export function toDesktopToolCard(status: DesktopToolStatus): DesktopToolCard {
	const catalog = DESKTOP_TOOL_CATALOG[status.id]
	return {
		...catalog,
		...status,
		name: catalog.name,
		primaryAction: status.connected
			? "connected"
			: status.detected
				? "connect"
				: "set-up",
	}
}

export function sortDesktopToolCards(cards: DesktopToolCard[]) {
	return [...cards].sort((a, b) => {
		const aRank = a.connected ? 0 : a.detected ? 1 : 2
		const bRank = b.connected ? 0 : b.detected ? 1 : 2
		if (aRank !== bRank) return aRank - bRank
		return a.name.localeCompare(b.name)
	})
}
