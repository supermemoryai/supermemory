import { create } from "zustand"

interface GraphHighlightsState {
	documentIds: string[]
	lastUpdated: number
	setDocumentIds: (ids: string[]) => void
	clear: () => void
}

export const useGraphHighlightsStore = create<GraphHighlightsState>()(
	(set, get) => ({
		documentIds: [],
		lastUpdated: 0,
		setDocumentIds: (ids) => {
			const next = Array.from(new Set(ids))
			const prev = get().documentIds
			if (
				prev.length === next.length &&
				prev.every((id) => next.includes(id))
			) {
				return
			}
			set({ documentIds: next, lastUpdated: Date.now() })
		},
		clear: () => set({ documentIds: [], lastUpdated: Date.now() }),
	}),
)

export function useGraphHighlights() {
	const documentIds = useGraphHighlightsStore((s) => s.documentIds)
	const lastUpdated = useGraphHighlightsStore((s) => s.lastUpdated)
	const setDocumentIds = useGraphHighlightsStore((s) => s.setDocumentIds)
	const clear = useGraphHighlightsStore((s) => s.clear)
	return { documentIds, lastUpdated, setDocumentIds, clear }
}
