import { create } from "zustand"

interface QuickNoteDraftState {
	draftByProject: Record<string, string>
	setDraft: (projectId: string, draft: string) => void
	resetDraft: (projectId: string) => void
}

export const useQuickNoteDraftStore = create<QuickNoteDraftState>()(
	(set, get) => ({
		draftByProject: {},

		setDraft: (projectId, draft) => {
			const current = get().draftByProject[projectId]
			if (current === draft) return
			set((state) => ({
				draftByProject: {
					...state.draftByProject,
					[projectId]: draft,
				},
			}))
		},

		resetDraft: (projectId) => {
			const current = get().draftByProject[projectId]
			if (current === undefined || current === "") return
			set((state) => ({
				draftByProject: {
					...state.draftByProject,
					[projectId]: "",
				},
			}))
		},
	}),
)

export function useQuickNoteDraft(projectId: string) {
	const draft = useQuickNoteDraftStore((s) => s.draftByProject[projectId] ?? "")
	const setDraft = useQuickNoteDraftStore((s) => s.setDraft)
	const resetDraft = useQuickNoteDraftStore((s) => s.resetDraft)

	return {
		draft,
		setDraft: (value: string) => setDraft(projectId, value),
		resetDraft: () => resetDraft(projectId),
	}
}

export function useQuickNoteDraftReset(projectId: string) {
	const resetDraft = useQuickNoteDraftStore((s) => s.resetDraft)
	return () => resetDraft(projectId)
}
