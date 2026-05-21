import { App, PluginSettingTab, Setting } from "obsidian"
import type SupermemoryPlugin from "./main"

export class SupermemorySettingTab extends PluginSettingTab {
	plugin: SupermemoryPlugin

	constructor(app: App, plugin: SupermemoryPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this
		containerEl.empty()

		new Setting(containerEl)
			.setName("API Key")
			.setDesc("Your Supermemory API key. Get one at supermemory.ai/api-keys")
			.addText((text) =>
				text
					.setPlaceholder("sm_...")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim()
						await this.plugin.saveSettings()
					}),
			)

		new Setting(containerEl)
			.setName("API Base URL")
			.setDesc("Only change this if you self-host Supermemory.")
			.addText((text) =>
				text
					.setPlaceholder("https://api.supermemory.ai")
					.setValue(this.plugin.settings.apiBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.apiBaseUrl = value.trim()
						await this.plugin.saveSettings()
					}),
			)

		new Setting(containerEl)
			.setName("Container tag")
			.setDesc("Project / space to sync notes into.")
			.addText((text) =>
				text
					.setPlaceholder("sm_project_default")
					.setValue(this.plugin.settings.containerTag)
					.onChange(async (value) => {
						this.plugin.settings.containerTag = value.trim()
						await this.plugin.saveSettings()
					}),
			)

		new Setting(containerEl)
			.setName("Vault display name")
			.setDesc(
				"How this vault appears in Supermemory. Defaults to the vault folder name.",
			)
			.addText((text) =>
				text
					.setPlaceholder(this.app.vault.getName())
					.setValue(this.plugin.settings.vaultName)
					.onChange(async (value) => {
						this.plugin.settings.vaultName = value.trim()
						await this.plugin.saveSettings()
					}),
			)

		new Setting(containerEl)
			.setName("Sync on file save")
			.setDesc("Push changes to Supermemory whenever you save a note.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.syncOnSave)
					.onChange(async (value) => {
						this.plugin.settings.syncOnSave = value
						await this.plugin.saveSettings()
					}),
			)

		new Setting(containerEl)
			.setName("Sync on startup")
			.setDesc(
				"Reconcile any changes made while Obsidian was closed.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.syncOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.syncOnStartup = value
						await this.plugin.saveSettings()
					}),
			)
	}
}
