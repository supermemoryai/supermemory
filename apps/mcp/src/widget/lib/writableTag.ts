export function isWritableTag(
	candidate: string | null | undefined,
	writableTags: readonly string[],
): candidate is string {
	return !!candidate && writableTags.includes(candidate)
}

export function preferredWritableTag(
	candidate: string | null | undefined,
	writableTags: readonly string[],
): string | null {
	if (isWritableTag(candidate, writableTags)) return candidate
	return writableTags[0] ?? null
}

export function retainedWritableTag(
	candidate: string | null,
	writableTags: readonly string[],
): string | null {
	return isWritableTag(candidate, writableTags) ? candidate : null
}
