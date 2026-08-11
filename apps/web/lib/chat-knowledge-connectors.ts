export const NOVA_KNOWLEDGE_BASE_PROVIDERS = [
	"google-drive",
	"notion",
	"onedrive",
	"granola",
] as const

export type NovaKnowledgeBaseProvider =
	(typeof NOVA_KNOWLEDGE_BASE_PROVIDERS)[number]

export type NovaKnowledgeBaseStatus =
	| "active"
	| "syncing"
	| "error"
	| "not_connected"
	| "upgrade_required"

export type KnowledgeConnection = {
	provider: string
	metadata?: { documentCount?: number } | null
	lastSyncRun?: {
		status?: "running" | "completed" | "failed"
		startedAt?: string
		completedAt?: string
	} | null
}

export type KnowledgeConnectorState = {
	status: NovaKnowledgeBaseStatus
	connectionCount: number
	documentCount: number
	lastSyncStatus?: "running" | "completed" | "failed"
	lastSyncAt?: string
}

type PendingKnowledgeConnectionWindow = {
	popup: Window
	cleanupTimer: number
}

const pendingConnectionWindows = new Map<
	NovaKnowledgeBaseProvider,
	PendingKnowledgeConnectionWindow
>()

const KNOWLEDGE_BASE_NAMES: Record<NovaKnowledgeBaseProvider, string> = {
	"google-drive": "Google Drive",
	notion: "Notion",
	onedrive: "OneDrive",
	granola: "Granola",
}

function closePendingConnectionWindow(
	provider: NovaKnowledgeBaseProvider,
	closePopup: boolean,
) {
	const pending = pendingConnectionWindows.get(provider)
	if (!pending) return
	window.clearTimeout(pending.cleanupTimer)
	pendingConnectionWindows.delete(provider)
	if (closePopup && !pending.popup.closed) pending.popup.close()
}

export function reserveNovaKnowledgeConnectionWindow(
	provider: NovaKnowledgeBaseProvider,
): boolean {
	if (provider === "granola" || typeof window === "undefined") return false
	const existing = pendingConnectionWindows.get(provider)
	if (existing && !existing.popup.closed) {
		existing.popup.focus()
		return true
	}
	if (existing) closePendingConnectionWindow(provider, false)

	const popup = window.open(
		"about:blank",
		`supermemory-nova-${provider}-connection`,
	)
	if (!popup) return false
	popup.opener = null
	popup.document.title = `Connecting ${KNOWLEDGE_BASE_NAMES[provider]}…`
	popup.document.body.style.cssText =
		"margin:0;min-height:100vh;display:grid;place-items:center;background:#080b0f;color:#fafafa;font-family:ui-sans-serif,system-ui,sans-serif"
	const status = popup.document.createElement("p")
	status.textContent = `Preparing ${KNOWLEDGE_BASE_NAMES[provider]} connection…`
	status.style.cssText = "font-size:16px;opacity:.75"
	popup.document.body.append(status)

	const cleanupTimer = window.setTimeout(
		() => closePendingConnectionWindow(provider, true),
		5 * 60 * 1000,
	)
	pendingConnectionWindows.set(provider, { popup, cleanupTimer })
	return true
}

export function navigateReservedNovaKnowledgeConnectionWindow(
	provider: NovaKnowledgeBaseProvider,
	authLink: string,
): boolean {
	const pending = pendingConnectionWindows.get(provider)
	if (!pending || pending.popup.closed) {
		if (pending) closePendingConnectionWindow(provider, false)
		return false
	}
	pending.popup.location.replace(authLink)
	pending.popup.focus()
	return true
}

export function isNovaKnowledgeConnectionWindowOpen(
	provider: NovaKnowledgeBaseProvider,
): boolean {
	const pending = pendingConnectionWindows.get(provider)
	return Boolean(pending && !pending.popup.closed)
}

export function releaseNovaKnowledgeConnectionWindow(
	provider: NovaKnowledgeBaseProvider,
) {
	if (typeof window === "undefined") return
	closePendingConnectionWindow(provider, true)
}

export function isNovaKnowledgeBaseProvider(
	value: string | undefined,
): value is NovaKnowledgeBaseProvider {
	return NOVA_KNOWLEDGE_BASE_PROVIDERS.some((provider) => provider === value)
}

function latestConnection(connections: KnowledgeConnection[]) {
	return connections.reduce<KnowledgeConnection | undefined>((latest, item) => {
		if (!latest) return item
		const latestTime = Date.parse(
			latest.lastSyncRun?.startedAt ?? latest.lastSyncRun?.completedAt ?? "",
		)
		const itemTime = Date.parse(
			item.lastSyncRun?.startedAt ?? item.lastSyncRun?.completedAt ?? "",
		)
		return (Number.isFinite(itemTime) ? itemTime : 0) >
			(Number.isFinite(latestTime) ? latestTime : 0)
			? item
			: latest
	}, undefined)
}

export function deriveKnowledgeConnectorState({
	provider,
	connections,
	fallbackStatus,
}: {
	provider: NovaKnowledgeBaseProvider
	connections: KnowledgeConnection[]
	fallbackStatus: NovaKnowledgeBaseStatus
}): KnowledgeConnectorState {
	const providerConnections = connections.filter(
		(connection) => connection.provider === provider,
	)
	const latest = latestConnection(providerConnections)
	const lastSyncStatus = latest?.lastSyncRun?.status
	const status: NovaKnowledgeBaseStatus =
		fallbackStatus === "upgrade_required"
			? "upgrade_required"
			: lastSyncStatus === "running"
				? "syncing"
				: lastSyncStatus === "failed"
					? "error"
					: providerConnections.length > 0
						? "active"
						: "not_connected"

	return {
		status,
		connectionCount: providerConnections.length,
		documentCount: providerConnections.reduce(
			(total, connection) => total + (connection.metadata?.documentCount ?? 0),
			0,
		),
		lastSyncStatus,
		lastSyncAt:
			latest?.lastSyncRun?.completedAt ?? latest?.lastSyncRun?.startedAt,
	}
}
