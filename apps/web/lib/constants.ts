/**
 * sessionStorage key used to stash the full plugin-connect URL so that
 * the onboarding flow can redirect back to it after the user creates
 * their first organization.
 */
export const PENDING_CONNECT_URL_KEY = "supermemory-pending-connect-url"

/**
 * Consume the pending plugin-connect URL from sessionStorage (if any)
 * and return the relative path to redirect to.  Returns `null` when
 * there is nothing stored or the stored value is invalid.
 *
 * This is extracted into a shared helper so that every onboarding
 * completion / skip path can reuse it (SetupHeader, IntegrationsStep,
 * InitialHeader, etc.).
 */
export function consumePendingConnectUrl(): string | null {
	try {
		const pendingUrl = sessionStorage.getItem(PENDING_CONNECT_URL_KEY)
		if (!pendingUrl) return null
		sessionStorage.removeItem(PENDING_CONNECT_URL_KEY)
		const parsed = new URL(pendingUrl)
		return parsed.pathname + parsed.search + parsed.hash
	} catch (e) {
		console.warn("Failed to access sessionStorage for pending connect URL", e)
		return null
	}
}
