"use client"

import { useSyncRuns, type SyncRun } from "@/hooks/use-sync-runs"

// TODO: replace string matching with a discriminated `errorKind` from the backend.
// 403 alone matches per-file ACL denials; 401 alone matches transient retries.
// Require the status code to co-occur with explicit auth/token/grant context.
const AUTH_ERROR_PATTERNS = [
	/invalid[_\s-]?grant/i,
	/unauthorized[_\s-]?client/i,
	/\bunauthenticated\b/i,
	/needs?[_\s-]?reauth/i,
	/no\s+refresh[_\s-]?token/i,
	/(?:access|refresh)[_\s-]?token[^\n]{0,40}(?:expired|revoked|invalid|missing)/i,
	/\b(?:401|403)\b[^\n]{0,80}(?:auth|token|grant|credentials?)/i,
	/(?:auth|token|grant|credentials?)[^\n]{0,80}\b(?:401|403)\b/i,
]

function isAuthFailure(run: SyncRun): boolean {
	if (run.status !== "failed" || !run.error) return false
	return AUTH_ERROR_PATTERNS.some((p) => p.test(run.error ?? ""))
}

export function useConnectionHealth(connectionId: string) {
	const { data: runs, isLoading } = useSyncRuns(connectionId)
	const latest = runs?.[0] ?? null
	const needsReauth = !!latest && isAuthFailure(latest)
	return { needsReauth, latestRun: latest, isLoading }
}
