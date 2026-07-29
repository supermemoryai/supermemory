import { afterEach, describe, expect, it, vi } from "vitest"
import type { ViewMessage } from "../../shared/types"
import { loadViewCheckpoint, saveViewCheckpoint } from "./viewCheckpoint"

function createStorage() {
	const values = new Map<string, string>()
	return {
		getItem: vi.fn((key: string) => values.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => {
			values.set(key, value)
		}),
		removeItem: vi.fn((key: string) => {
			values.delete(key)
		}),
		clear: vi.fn(() => values.clear()),
		key: vi.fn(() => null),
		get length() {
			return values.size
		},
	}
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("view checkpoints", () => {
	it("restores a completed view from localStorage by stable view id", () => {
		const storage = createStorage()
		vi.stubGlobal("localStorage", storage)
		const view: ViewMessage = {
			view: "save-success",
			viewId: "80fa74b9-8347-45f7-a2b5-d7a3d5d67616",
			id: "memory-123",
			containerTag: "model_test",
		}

		saveViewCheckpoint(view)

		expect(loadViewCheckpoint(view.viewId)).toEqual(view)
	})

	it("does not persist non-terminal form views", () => {
		const storage = createStorage()
		vi.stubGlobal("localStorage", storage)
		const view: ViewMessage = {
			view: "save",
			viewId: "80fa74b9-8347-45f7-a2b5-d7a3d5d67616",
			writableTags: ["model_test"],
		}

		saveViewCheckpoint(view)

		expect(storage.setItem).not.toHaveBeenCalled()
		expect(loadViewCheckpoint(view.viewId)).toBeNull()
	})

	it("mirrors compact state into ChatGPT widget state", () => {
		const storage = createStorage()
		const setWidgetState = vi.fn()
		vi.stubGlobal("localStorage", storage)
		vi.stubGlobal("window", {
			openai: {
				widgetState: {
					privateContent: { existing: true },
				},
				setWidgetState,
			},
		})
		const view: ViewMessage = {
			view: "confirmation",
			viewId: "80fa74b9-8347-45f7-a2b5-d7a3d5d67616",
			containerTag: "model_test",
		}

		saveViewCheckpoint(view)

		expect(setWidgetState).toHaveBeenCalledWith({
			modelContent: 'Supermemory active workspace is now "model_test".',
			privateContent: {
				existing: true,
				supermemoryView: view,
			},
		})
	})

	it("can restore from ChatGPT widget state before a tool result is replayed", () => {
		const view: ViewMessage = {
			view: "upload-success",
			viewId: "80fa74b9-8347-45f7-a2b5-d7a3d5d67616",
			id: "document-123",
			fileName: "notes.txt",
			containerTag: "model_test",
		}
		vi.stubGlobal("window", {
			openai: {
				widgetState: {
					privateContent: { supermemoryView: view },
				},
			},
		})

		expect(loadViewCheckpoint()).toEqual(view)
	})
})
