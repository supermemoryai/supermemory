import { Notice, Plugin } from "obsidian"
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

		this.addSettingTab(new SupermemorySettingTab(this.app, this))

		this.addRibbonIcon("cloud-upload", "Sync vault to Supermemory", () => {
			if (!this.settings.apiKey) {
				new Notice("Set your Supermemory API key in plugin settings first.")
				return
			}
			new Notice("Supermemory sync starting...")
		})

		this.addCommand({
			id: "sync-vault",
			name: "Sync vault now",
			callback: () => {
				if (!this.settings.apiKey) {
					new Notice(
						"Set your Supermemory API key in plugin settings first.",
					)
					return
				}
				new Notice("Supermemory sync starting...")
			},
		})
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
	}
}
