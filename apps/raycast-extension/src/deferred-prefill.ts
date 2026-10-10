export function createDeferredPrefillOwner(
	applyValue: (value: string) => void,
) {
	let prefillOwnsValue = true

	return {
		updateFromUser(value: string) {
			prefillOwnsValue = false
			applyValue(value)
		},
		start(readValue: () => Promise<string>) {
			let active = true
			const completion = (async () => {
				try {
					const value = await readValue()
					if (active && prefillOwnsValue && value) {
						applyValue(value)
					}
				} catch {
					// Selection is unavailable; keep the current value unchanged.
				}
			})()

			return {
				completion,
				cancel() {
					active = false
				},
			}
		},
	}
}

export const SEARCH_QUERY_DEBOUNCE_MS = 300

type CancelScheduledQuery = () => void
type ScheduleQuery = (
	callback: () => void,
	delayMs: number,
) => CancelScheduledQuery

const scheduleQuery: ScheduleQuery = (callback, delayMs) => {
	const timeout = setTimeout(callback, delayMs)
	return () => clearTimeout(timeout)
}

export function createSearchInputAdapter(
	applySearchText: (value: string) => void,
	applySearchQuery: (value: string) => void,
	schedule: ScheduleQuery = scheduleQuery,
) {
	let cancelScheduledQuery: CancelScheduledQuery | undefined

	const applyValue = (value: string) => {
		applySearchText(value)
		cancelScheduledQuery?.()
		cancelScheduledQuery = undefined

		if (!value.trim()) {
			applySearchQuery(value)
			return
		}

		cancelScheduledQuery = schedule(() => {
			cancelScheduledQuery = undefined
			applySearchQuery(value)
		}, SEARCH_QUERY_DEBOUNCE_MS)
	}

	const prefillOwner = createDeferredPrefillOwner(applyValue)

	return {
		getListProps(searchText: string) {
			return {
				onSearchTextChange: prefillOwner.updateFromUser,
				searchText,
				throttle: false as const,
			}
		},
		startPrefill: prefillOwner.start,
		cancelPendingQuery() {
			cancelScheduledQuery?.()
			cancelScheduledQuery = undefined
		},
	}
}
