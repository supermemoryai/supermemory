import posthog from "posthog-js"
import { useEffect, useState } from "react"

// Reactive PostHog boolean flag via the global singleton (the app uses a custom
// provider, so posthog-js/react hooks have no context). Unloaded/undefined = false.
export function useFeatureFlag(key: string): boolean {
	const [enabled, setEnabled] = useState(false)
	useEffect(() => {
		const sync = () => setEnabled(posthog.isFeatureEnabled?.(key) === true)
		sync()
		return posthog.onFeatureFlags(() => sync())
	}, [key])
	return enabled
}
