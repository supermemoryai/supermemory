export interface ScopedAuthValue<T> {
	scope: string
	data: T
}

export type ScopedAuthRead<T> = { ready: false } | { ready: true; data: T }

export function createAuthSessionScope({
	isPending,
	sessionId,
	userId,
}: {
	isPending: boolean
	sessionId: string | null | undefined
	userId: string | null | undefined
}): string | null {
	if (isPending || !sessionId || !userId) return null
	return JSON.stringify([sessionId, userId])
}

export function readScopedAuthValue<T>(
	currentScope: string | null,
	value: ScopedAuthValue<T> | null,
): ScopedAuthRead<T> {
	if (!currentScope || value?.scope !== currentScope) return { ready: false }
	return { ready: true, data: value.data }
}

export function scopedAuthValueForResponse<T>(
	currentScope: string | null,
	requestedScope: string,
	data: T,
): ScopedAuthValue<T> | null {
	if (currentScope !== requestedScope) return null
	return { scope: requestedScope, data }
}

export function isOAuthConsentPath(pathname: string): boolean {
	return pathname === "/oauth/consent" || pathname === "/oauth/consent/"
}
