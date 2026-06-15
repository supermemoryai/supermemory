export type McpSetupAvailability = {
	manual: boolean
	oneClick: boolean
}

const DEFAULT_SETUP: McpSetupAvailability = {
	manual: true,
	oneClick: true,
}

/**
 * Which setup surfaces each MCP client supports. Clients not listed use both
 * manual instructions and one-click (CLI / deeplink / URL copy).
 */
export const MCP_CLIENT_SETUP: Record<string, McpSetupAvailability> = {
	antigravity: { manual: true, oneClick: false },
	chatgpt: { manual: true, oneClick: false },
	cline: { manual: false, oneClick: true },
}

export function getMcpClientSetup(clientKey: string): McpSetupAvailability {
	return MCP_CLIENT_SETUP[clientKey] ?? DEFAULT_SETUP
}

export function mcpClientSetupShowsTabs(setup: McpSetupAvailability): boolean {
	return setup.manual && setup.oneClick
}

export function defaultMcpSetupTab(
	setup: McpSetupAvailability,
): "manual" | "oneClick" {
	if (setup.manual && setup.oneClick) return "manual"
	if (setup.manual) return "manual"
	return "oneClick"
}

export function resolveMcpSetupTabForClient(
	clientKey: string,
	preferred: "manual" | "oneClick" | null | undefined,
): "manual" | "oneClick" {
	const s = getMcpClientSetup(clientKey)
	if (!s.manual) return "oneClick"
	if (!s.oneClick) return "manual"
	return preferred ?? "manual"
}

export function mcpClientShowsOneClick(
	setup: McpSetupAvailability,
	tab: "manual" | "oneClick",
): boolean {
	return setup.oneClick && (!setup.manual || tab === "oneClick")
}

export function mcpClientShowsManual(
	setup: McpSetupAvailability,
	tab: "manual" | "oneClick",
): boolean {
	return setup.manual && (!setup.oneClick || tab === "manual")
}

export function setupInstructionsSubtitle(setup: McpSetupAvailability): string {
	if (mcpClientSetupShowsTabs(setup)) {
		return "Choose manual instructions or one click setup (CLI, deeplink, or paste URL)."
	}
	if (setup.manual) {
		return "Follow the steps below to finish setup."
	}
	return "Use the command or link below, then complete OAuth if prompted."
}
