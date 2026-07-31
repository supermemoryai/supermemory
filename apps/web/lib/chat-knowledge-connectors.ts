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
