export type SyncMode = "all" | "folders"

export interface SupermemorySettings {
	apiKey: string
	apiBaseUrl: string
	containerTag: string
	vaultName: string
	connectionId: string
	syncOnSave: boolean
	syncOnStartup: boolean
	syncMode: SyncMode
	/** Comma-separated folder paths; only used when syncMode === "folders" */
	includedFolders: string
}
