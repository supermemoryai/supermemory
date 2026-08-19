import { describe, expect, it } from "bun:test"
import {
	isSaveMemoryShortcut,
	type SaveMemoryShortcutEvent,
} from "./keyboard-shortcut"

function shortcutEvent(
	overrides: Partial<SaveMemoryShortcutEvent> = {},
): SaveMemoryShortcutEvent {
	return {
		ctrlKey: false,
		key: "M",
		metaKey: false,
		repeat: false,
		shiftKey: true,
		...overrides,
	}
}

describe("isSaveMemoryShortcut", () => {
	it("accepts uppercase M from Ctrl+Shift+M", () => {
		expect(isSaveMemoryShortcut(shortcutEvent({ ctrlKey: true }))).toBeTrue()
	})

	it("accepts uppercase M from Command+Shift+M", () => {
		expect(isSaveMemoryShortcut(shortcutEvent({ metaKey: true }))).toBeTrue()
	})

	it("accepts lowercase key representations", () => {
		expect(
			isSaveMemoryShortcut(shortcutEvent({ ctrlKey: true, key: "m" })),
		).toBeTrue()
	})

	it("rejects missing modifiers and other keys", () => {
		expect(isSaveMemoryShortcut(shortcutEvent())).toBeFalse()
		expect(
			isSaveMemoryShortcut(shortcutEvent({ ctrlKey: true, shiftKey: false })),
		).toBeFalse()
		expect(
			isSaveMemoryShortcut(shortcutEvent({ ctrlKey: true, key: "N" })),
		).toBeFalse()
	})

	it("rejects repeated keydown events", () => {
		expect(
			isSaveMemoryShortcut(shortcutEvent({ ctrlKey: true, repeat: true })),
		).toBeFalse()
	})
})
