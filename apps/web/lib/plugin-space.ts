export type PluginSpaceInfo = {
	pluginId: "claude-code" | "openclaw" | "opencode" | "codex" | "amp"
	label: string
	iconSrc: string | null
	projectId?: string
}

type PluginDef = {
	id: PluginSpaceInfo["pluginId"]
	label: string
	iconSrc: string | null
	prefixes: string[]
}

const PLUGINS: PluginDef[] = [
	{
		id: "claude-code",
		label: "Claude Code",
		iconSrc: "/images/plugins/claude-code.svg",
		prefixes: ["claudecode"],
	},
	{
		id: "openclaw",
		label: "OpenClaw",
		iconSrc: "/images/plugins/openclaw.svg",
		prefixes: ["openclaw"],
	},
	{
		id: "opencode",
		label: "OpenCode",
		iconSrc: "/images/plugins/opencode.svg",
		prefixes: ["opencode"],
	},
	{
		id: "codex",
		label: "Codex",
		iconSrc: "/images/plugins/codex.png",
		prefixes: ["codex"],
	},
	{
		id: "amp",
		label: "Amp",
		iconSrc: null,
		prefixes: ["amp"],
	},
]

function parsePluginRest(rest: string): { projectId?: string } {
	if (!rest || rest === "default" || rest === "global") {
		return { projectId: "Global" }
	}
	const userMatch = rest.match(/^user[_-]([0-9a-f]{6,64})$/i)
	if (userMatch?.[1]) return { projectId: `User · ${userMatch[1].slice(0, 6)}` }
	const projectMatch = rest.match(/^project[_-]([0-9a-f]{6,64})$/i)
	if (projectMatch?.[1]) return { projectId: projectMatch[1].slice(0, 6) }
	const hexOnly = rest.match(/^([0-9a-f]{6,64})$/i)
	if (hexOnly?.[1]) return { projectId: hexOnly[1].slice(0, 6) }
	return { projectId: rest.slice(0, 24) }
}

const PLUGIN_ICON_BY_LABEL: Record<string, string> = {
	"Claude Code": "/images/plugins/claude-code.svg",
	OpenClaw: "/images/plugins/openclaw.svg",
	OpenCode: "/images/plugins/opencode.svg",
	Codex: "/images/plugins/codex.png",
}

export function pluginIconByLabel(
	label: string | null | undefined,
): string | null {
	if (!label) return null
	return PLUGIN_ICON_BY_LABEL[label] ?? null
}

export function pluginInitial(label: string | null | undefined): string {
	if (!label) return "?"
	return label.trim().charAt(0).toUpperCase() || "?"
}

export type PluginDocSource = {
	pluginId: "claude-code"
	label: string
	iconSrc: string
	projectName?: string
	formatLabel: string
	type: "session_turn" | "project-knowledge" | "manual" | "unknown"
}

function formatLabelForType(t: string | undefined): {
	formatLabel: string
	type: PluginDocSource["type"]
} {
	switch (t) {
		case "session_turn":
			return { formatLabel: "Session", type: "session_turn" }
		case "project-knowledge":
			return { formatLabel: "Project knowledge", type: "project-knowledge" }
		case "manual":
			return { formatLabel: "Note", type: "manual" }
		default:
			return { formatLabel: "Note", type: "unknown" }
	}
}

export function detectPluginSource(
	metadata: Record<string, unknown> | null | undefined,
	documentSource?: string | null,
): PluginDocSource | null {
	const sourceFromMeta =
		metadata && typeof metadata.sm_source === "string"
			? metadata.sm_source
			: null
	const source = documentSource ?? sourceFromMeta
	if (source !== "claude-code-plugin") return null

	const md = metadata ?? {}
	const project =
		typeof md.project === "string" && md.project.trim()
			? md.project.trim()
			: undefined
	const t = typeof md.type === "string" ? md.type : undefined
	const { formatLabel, type } = formatLabelForType(t)

	return {
		pluginId: "claude-code",
		label: "Claude Code",
		iconSrc: "/images/plugins/claude-code.svg",
		projectName: project,
		formatLabel,
		type,
	}
}

export function detectPluginSpace(
	containerTag: string,
): PluginSpaceInfo | null {
	if (!containerTag) return null

	for (const plugin of PLUGINS) {
		for (const prefix of plugin.prefixes) {
			if (containerTag === prefix) {
				return {
					pluginId: plugin.id,
					label: plugin.label,
					iconSrc: plugin.iconSrc,
					projectId: "Global",
				}
			}
			const separator = containerTag[prefix.length]
			if (
				containerTag.startsWith(prefix) &&
				(separator === "_" || separator === "-")
			) {
				const rest = containerTag.slice(prefix.length + 1)
				const parsed = parsePluginRest(rest)
				return {
					pluginId: plugin.id,
					label: plugin.label,
					iconSrc: plugin.iconSrc,
					projectId: parsed.projectId,
				}
			}
		}
	}

	return null
}
