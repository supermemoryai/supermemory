export type ConnectorPauseReason = "google_verification"

export interface ConnectorPause {
	reason: ConnectorPauseReason
	label: string
	message: string
}

const PAUSED_CONNECTORS: Record<string, ConnectorPause> = {
	"google-drive": {
		reason: "google_verification",
		label: "Google Drive",
		message:
			"New Google Drive connections are paused while Google reviews our app. Already connected? Your files keep syncing.",
	},
	gmail: {
		reason: "google_verification",
		label: "Gmail",
		message:
			"New Gmail connections are paused while Google reviews our app. Already connected? Your email keeps syncing.",
	},
}

export function connectorPause(provider: string): ConnectorPause | undefined {
	return PAUSED_CONNECTORS[provider]
}

export function isConnectorPaused(provider: string): boolean {
	return provider in PAUSED_CONNECTORS
}
