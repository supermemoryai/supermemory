export type SaveMemoryShortcutEvent = Pick<
	KeyboardEvent,
	"ctrlKey" | "key" | "metaKey" | "repeat" | "shiftKey"
>

export function isSaveMemoryShortcut(event: SaveMemoryShortcutEvent): boolean {
	return (
		!event.repeat &&
		(event.ctrlKey || event.metaKey) &&
		event.shiftKey &&
		event.key.toLowerCase() === "m"
	)
}
