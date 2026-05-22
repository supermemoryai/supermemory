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

function formatTimeAgo(ms: number): string {
	const seconds = Math.floor((Date.now() - ms) / 1000)
	if (seconds < 60) return "just now"
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	return `${hours}h ago`
}

export default class SupermemoryPlugin extends Plugin {
	settings: SupermemorySettings = DEFAULT_SETTINGS
	private syncEngine: SyncEngine | null = null
	private statusBarEl: HTMLElement | null = null
	private lastSyncTime: number | null = null
	private lastSyncCount = 0

	async onload() {
		await this.loadSettings()
		configure(this.settings)

		this.statusBarEl = this.addStatusBarItem()
		this.updateStatusBar()

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

	private updateStatusBar(syncing?: { current: number; total: number }) {
		if (!this.statusBarEl) return

		if (syncing) {
			this.statusBarEl.setText(
				`Supermemory: syncing ${syncing.current}/${syncing.total}...`,
			)
			return
		}

		if (this.lastSyncTime) {
			this.statusBarEl.setText(
				`Supermemory: synced ${formatTimeAgo(this.lastSyncTime)} · ${this.lastSyncCount} notes`,
			)
		} else if (!this.settings.apiKey) {
			this.statusBarEl.setText("Supermemory: no API key")
		} else {
			this.statusBarEl.setText("Supermemory: ready")
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

		const files = this.app.vault.getMarkdownFiles()
		this.updateStatusBar({ current: 0, total: files.length })

		const result = await this.syncEngine.fullSync((current, total) => {
			this.updateStatusBar({ current, total })
		})

		this.lastSyncTime = Date.now()
		this.lastSyncCount = result.queued
		this.updateStatusBar()
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
		this.updateStatusBar()
	}
}
