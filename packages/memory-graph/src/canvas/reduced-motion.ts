/**
 * Detects the user's `prefers-reduced-motion` setting.
 *
 * The graph is otherwise in constant motion (force simulation settling,
 * momentum panning, spring zoom), which can be uncomfortable for people with
 * vestibular / motion sensitivities. Callers use this to render a calm, static
 * layout instead while keeping every interaction available.
 *
 * SSR-safe and defensive: returns false when `matchMedia` is unavailable.
 */
export function prefersReducedMotion(): boolean {
	if (typeof globalThis.matchMedia !== "function") return false
	try {
		return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
	} catch {
		return false
	}
}
