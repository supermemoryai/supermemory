import { Notice, Plugin, type TAbstractFile, TFile } from "obsidian"
import { configure, createConnection } from "./api"
import { SupermemorySettingTab } from "./settings"
import { SyncEngine } from "./sync"
import type { SupermemorySettings } from "./types"

const DEFAULT_SETTINGS: SupermemorySettings = {
	apiKey: "",
	apiBaseUrl: "https://api.supermemory.ai",
	containerTag: "sm_project_obsidian_default",
	vaultName: "",
	connectionId: "",
	syncOnSave: true,
	syncOnStartup: true,
	syncMode: "all",
	includedFolders: "",
}

export default class SupermemoryPlugin extends Plugin {
	settings: SupermemorySettings = DEFAULT_SETTINGS
	private syncEngine: SyncEngine | null = null

	async onload() {
		await this.loadSettings()
		configure(this.settings)

		this.addSettingTab(new SupermemorySettingTab(this.app, this))

		this.addRibbonIcon("cloud-upload", "Sync vault to Supermemory", () => {
			this.syncVault()
		})

		this.addCommand({
			id: "sync-vault",
			name: "Sync vault now",
			callback: () => this.syncVault(),
		})

		if (this.settings.syncOnSave) {
			this.registerVaultEvents()
		}

		if (this.settings.syncOnStartup && this.settings.apiKey) {
			this.app.workspace.onLayoutReady(() => this.syncVault())
		}
	}

	private registerVaultEvents() {
		this.registerEvent(
			this.app.vault.on("modify", (file: TAbstractFile) => {
				if (file instanceof TFile) this.syncEngine?.onFileChange(file)
			}),
		)
		this.registerEvent(
			this.app.vault.on("create", (file: TAbstractFile) => {
				if (file instanceof TFile) this.syncEngine?.onFileChange(file)
			}),
		)
		this.registerEvent(
			this.app.vault.on("delete", (file: TAbstractFile) => {
				if (file instanceof TFile) this.syncEngine?.onFileDelete(file)
			}),
		)
		this.registerEvent(
			this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
				if (file instanceof TFile) this.syncEngine?.onFileRename(file, oldPath)
			}),
		)
	}

	async ensureConnection(): Promise<string | null> {
		if (!this.settings.apiKey) {
			new Notice("Set your Supermemory API key in plugin settings first.")
			return null
		}

		if (this.settings.connectionId) {
			return this.settings.connectionId
		}

		const vaultId = (this.app as unknown as { appId: string }).appId
		const vaultName = this.settings.vaultName || this.app.vault.getName()

		try {
			const result = await createConnection(
				vaultId,
				vaultName,
				this.settings.containerTag,
			)
			this.settings.connectionId = result.id
			await this.saveSettings()
			return result.id
		} catch (e) {
			new Notice(
				`Supermemory: failed to connect — ${e instanceof Error ? e.message : "unknown error"}`,
			)
			return null
		}
	}

	private async syncVault() {
		const connectionId = await this.ensureConnection()
		if (!connectionId) return

		if (!this.syncEngine) {
			this.syncEngine = new SyncEngine(this.app, connectionId, this.settings)
		} else {
			this.syncEngine.updateSettings(this.settings)
		}

		await this.syncEngine.fullSync()
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		)
	}

	async saveSettings() {
		await this.saveData(this.settings)
		configure(this.settings)
		this.syncEngine?.updateSettings(this.settings)
	}
}
