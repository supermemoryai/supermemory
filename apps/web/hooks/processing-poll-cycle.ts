export const MAX_PROCESSING_POLLS = 60

export type ProcessingPollCycle = {
	documentIds: readonly string[]
	firstDataUpdateCount: number
	queryHash: string
}

export type ProcessingPollSnapshot = {
	documentIds: readonly string[]
	totalCount: number
	dataUpdateCount: number
	queryHash: string
}

export type ProcessingPollDecision = {
	cycle: ProcessingPollCycle | null
	shouldPoll: boolean
}

function normalizedDocumentIds(documentIds: readonly string[]) {
	return [...new Set(documentIds)].sort()
}

function hasSameDocumentIds(left: readonly string[], right: readonly string[]) {
	return (
		left.length === right.length &&
		left.every((documentId, index) => documentId === right[index])
	)
}

export function decideProcessingPoll(
	cycle: ProcessingPollCycle | null,
	snapshot: ProcessingPollSnapshot,
): ProcessingPollDecision {
	if (snapshot.totalCount === 0) {
		return { cycle: null, shouldPoll: false }
	}

	const documentIds = normalizedDocumentIds(snapshot.documentIds)
	const startsNewCycle =
		cycle === null ||
		cycle.queryHash !== snapshot.queryHash ||
		!hasSameDocumentIds(cycle.documentIds, documentIds) ||
		snapshot.dataUpdateCount < cycle.firstDataUpdateCount
	const nextCycle = startsNewCycle
		? {
				documentIds,
				firstDataUpdateCount: snapshot.dataUpdateCount,
				queryHash: snapshot.queryHash,
			}
		: cycle
	// React Query's count spans the cache lifetime, so make it cycle-relative.
	const updatesInCycle =
		snapshot.dataUpdateCount - nextCycle.firstDataUpdateCount + 1

	return {
		cycle: nextCycle,
		shouldPoll: updatesInCycle < MAX_PROCESSING_POLLS,
	}
}
