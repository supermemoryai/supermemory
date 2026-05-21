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
			.addText((text) => {
				text.inputEl.type = "password"
				text
					.setPlaceholder("sm_...")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim()
						await this.plugin.saveSettings()
					})
			})

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
	}
}
