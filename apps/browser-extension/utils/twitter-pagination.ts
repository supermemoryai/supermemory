export function getNextUnseenCursor(
	nextCursor: string | null,
	seenCursors: ReadonlySet<string>,
): string | null {
	if (!nextCursor || seenCursors.has(nextCursor)) {
		return null
	}

	return nextCursor
}
