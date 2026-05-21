import { Notice, Plugin } from "obsidian"
import { configure, createConnection } from "./api"
import { SupermemorySettingTab } from "./settings"
import type { SupermemorySettings } from "./types"

const DEFAULT_SETTINGS: SupermemorySettings = {
	apiKey: "",
	apiBaseUrl: "https://api.supermemory.ai",
	containerTag: "sm_project_obsidian_default",
	vaultName: "",
	connectionId: "",
	syncOnSave: true,
	syncOnStartup: true,
}

export default class SupermemoryPlugin extends Plugin {
	settings: SupermemorySettings = DEFAULT_SETTINGS

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
		new Notice("Supermemory: sync starting...")
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
	}
}
