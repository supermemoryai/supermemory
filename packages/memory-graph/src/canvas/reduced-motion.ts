// SSR-safe; false when matchMedia is unavailable.
export function prefersReducedMotion(): boolean {
	if (typeof globalThis.matchMedia !== "function") return false
	try {
		return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
	} catch {
		return false
	}
}
