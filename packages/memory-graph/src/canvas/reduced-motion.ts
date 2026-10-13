// SSR-safe; null when matchMedia is unavailable.
export function getReducedMotionQuery(): MediaQueryList | null {
	if (typeof globalThis.matchMedia !== "function") return null
	try {
		return globalThis.matchMedia("(prefers-reduced-motion: reduce)")
	} catch {
		return null
	}
}

export function prefersReducedMotion(): boolean {
	return getReducedMotionQuery()?.matches ?? false
}
