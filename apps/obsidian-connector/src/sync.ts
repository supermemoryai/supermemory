import { type App, Notice, TFile, parseFrontMatterEntry, parseFrontMatterTags } from "obsidian"
import { pushDeletions, pushNotes, type NotePayload } from "./api"

const BATCH_SIZE = 50
const DEBOUNCE_MS = 3000

interface SyncState {
	syncing: boolean
	lastFullSync: number
}

export class SyncEngine {
	private app: App
	private connectionId: string
	private state: SyncState = { syncing: false, lastFullSync: 0 }
	private pendingChanges: Map<string, "upsert" | "delete"> = new Map()
	private debounceTimer: ReturnType<typeof setTimeout> | null = null

	constructor(app: App, connectionId: string) {
		this.app = app
		this.connectionId = connectionId
	}

	async fullSync(): Promise<{ queued: number; failed: number }> {
		if (this.state.syncing) {
			new Notice("Supermemory: sync already in progress.")
			return { queued: 0, failed: 0 }
		}

		this.state.syncing = true
		let totalQueued = 0
		let totalFailed = 0

		try {
			const files = this.app.vault.getMarkdownFiles()
			const batches = this.chunk(files, BATCH_SIZE)

			for (const batch of batches) {
				const notes = await Promise.all(batch.map((f) => this.fileToPayload(f)))
				const valid = notes.filter((n): n is NotePayload => n !== null)
				if (valid.length === 0) continue

				try {
					const result = await pushNotes(this.connectionId, valid)
					totalQueued += result.queuedCount
				} catch {
					totalFailed += valid.length
				}
			}

			this.state.lastFullSync = Date.now()
			new Notice(
				`Supermemory: synced ${totalQueued} note${totalQueued !== 1 ? "s" : ""}${totalFailed > 0 ? `, ${totalFailed} failed` : ""}.`,
			)
		} finally {
			this.state.syncing = false
		}

		return { queued: totalQueued, failed: totalFailed }
	}

	onFileChange(file: TFile) {
		if (!(file instanceof TFile) || file.extension !== "md") return
		this.pendingChanges.set(file.path, "upsert")
		this.schedulePush()
	}

	onFileDelete(file: TFile) {
		if (!(file instanceof TFile) || file.extension !== "md") return
		this.pendingChanges.set(file.path, "delete")
		this.schedulePush()
	}

	onFileRename(file: TFile, oldPath: string) {
		if (!(file instanceof TFile) || file.extension !== "md") return
		this.pendingChanges.set(oldPath, "delete")
		this.pendingChanges.set(file.path, "upsert")
		this.schedulePush()
	}

	private schedulePush() {
		if (this.debounceTimer) clearTimeout(this.debounceTimer)
		this.debounceTimer = setTimeout(() => this.flushPending(), DEBOUNCE_MS)
	}

	private async flushPending() {
		if (this.pendingChanges.size === 0) return
		if (this.state.syncing) {
			this.schedulePush()
			return
		}

		this.state.syncing = true
		const changes = new Map(this.pendingChanges)
		this.pendingChanges.clear()

		try {
			const upserts: string[] = []
			const deletes: string[] = []

			for (const [path, action] of changes) {
				if (action === "upsert") upserts.push(path)
				else deletes.push(path)
			}

			if (deletes.length > 0) {
				await pushDeletions(
					this.connectionId,
					deletes.map((path) => ({ path })),
				)
			}

			if (upserts.length > 0) {
				const files = upserts
					.map((path) => this.app.vault.getAbstractFileByPath(path))
					.filter((f): f is TFile => f instanceof TFile)

				const batches = this.chunk(files, BATCH_SIZE)
				for (const batch of batches) {
					const notes = await Promise.all(
						batch.map((f) => this.fileToPayload(f)),
					)
					const valid = notes.filter((n): n is NotePayload => n !== null)
					if (valid.length > 0) {
						await pushNotes(this.connectionId, valid)
					}
				}
			}
		} catch {
			// Re-queue on failure so the next debounce retries
			for (const [path, action] of changes) {
				if (!this.pendingChanges.has(path)) {
					this.pendingChanges.set(path, action)
				}
			}
			this.schedulePush()
		} finally {
			this.state.syncing = false
		}
	}

	private async fileToPayload(file: TFile): Promise<NotePayload | null> {
		try {
			const content = await this.app.vault.cachedRead(file)
			const cache = this.app.metadataCache.getFileCache(file)
			let frontmatter: Record<string, unknown> | undefined

			if (cache?.frontmatter) {
				frontmatter = { ...cache.frontmatter }
				delete frontmatter.position
				const tags = parseFrontMatterTags(cache.frontmatter)
				if (tags) frontmatter.tags = tags
			}

			return {
				path: file.path,
				content,
				title: file.basename,
				mtime: file.stat.mtime,
				frontmatter,
			}
		} catch {
			return null
		}
	}

	private chunk<T>(arr: T[], size: number): T[][] {
		const result: T[][] = []
		for (let i = 0; i < arr.length; i += size) {
			result.push(arr.slice(i, i + size))
		}
		return result
	}
}
