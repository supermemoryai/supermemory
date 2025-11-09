import type { UIMessage } from "@ai-sdk/react"
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { useCallback } from "react"
import { indexedDBStorage } from "./indexeddb-storage"

/**
 * Deep equality check for UIMessage arrays to prevent unnecessary state updates
 */
export function areUIMessageArraysEqual(a: UIMessage[], b: UIMessage[]): boolean {
	if (a === b) return true
	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		const msgA = a[i]
		const msgB = b[i]

		// Both messages should exist at this index
		if (!msgA || !msgB) return false

		if (msgA === msgB) continue

		if (msgA.id !== msgB.id || msgA.role !== msgB.role) {
			return false
		}

		// Compare the entire message using JSON serialization as a fallback
		// This handles all properties including parts, toolInvocations, etc.
		if (JSON.stringify(msgA) !== JSON.stringify(msgB)) {
			return false
		}
	}

	return true
}

export interface ConversationSummary {
	id: string
	title?: string
	lastUpdated: string
}

interface ConversationRecord {
	messages: UIMessage[]
	title?: string
	lastUpdated: string
}

interface ProjectConversationsState {
	currentChatId: string | null
	conversations: Record<string, ConversationRecord>
}

interface ConversationsStoreState {
	byProject: Record<string, ProjectConversationsState>
	setCurrentChatId: (projectId: string, chatId: string | null) => void
	setConversation: (
		projectId: string,
		chatId: string,
		messages: UIMessage[],
	) => void
	deleteConversation: (projectId: string, chatId: string) => void
	setConversationTitle: (
		projectId: string,
		chatId: string,
		title: string | undefined,
	) => void
}

export const usePersistentChatStore = create<ConversationsStoreState>()(
	persist(
		(set, _get) => ({
			byProject: {},

			setCurrentChatId(projectId, chatId) {
				set((state) => {
					const project = state.byProject[projectId] ?? {
						currentChatId: null,
						conversations: {},
					}
					return {
						byProject: {
							...state.byProject,
							[projectId]: { ...project, currentChatId: chatId },
						},
					}
				})
			},

			setConversation(projectId, chatId, messages) {
				const now = new Date().toISOString()
				set((state) => {
					const project = state.byProject[projectId] ?? {
						currentChatId: null,
						conversations: {},
					}
					const existing = project.conversations[chatId]

					// Check if messages are actually different to prevent unnecessary updates
					if (
						existing &&
						areUIMessageArraysEqual(existing.messages, messages)
					) {
						return state // No change needed
					}

					const shouldTouchLastUpdated = (() => {
						if (!existing) return messages.length > 0
						const previousLength = existing.messages?.length ?? 0
						return messages.length > previousLength
					})()

					const record: ConversationRecord = {
						messages,
						title: existing?.title,
						lastUpdated: shouldTouchLastUpdated
							? now
							: (existing?.lastUpdated ?? now),
					}
					return {
						byProject: {
							...state.byProject,
							[projectId]: {
								currentChatId: project.currentChatId,
								conversations: {
									...project.conversations,
									[chatId]: record,
								},
							},
						},
					}
				})
			},

			deleteConversation(projectId, chatId) {
				set((state) => {
					const project = state.byProject[projectId] ?? {
						currentChatId: null,
						conversations: {},
					}
					const { [chatId]: _, ...rest } = project.conversations
					const nextCurrent =
						project.currentChatId === chatId ? null : project.currentChatId
					return {
						byProject: {
							...state.byProject,
							[projectId]: { currentChatId: nextCurrent, conversations: rest },
						},
					}
				})
			},

			setConversationTitle(projectId, chatId, title) {
				const now = new Date().toISOString()
				set((state) => {
					const project = state.byProject[projectId] ?? {
						currentChatId: null,
						conversations: {},
					}
					const existing = project.conversations[chatId]
					if (!existing) return { byProject: state.byProject }
					return {
						byProject: {
							...state.byProject,
							[projectId]: {
								currentChatId: project.currentChatId,
								conversations: {
									...project.conversations,
									[chatId]: { ...existing, title, lastUpdated: now },
								},
							},
						},
					}
				})
			},
		}),
		{
			name: "supermemory-chats",
			storage: createJSONStorage(() => indexedDBStorage),
		},
	),
)

// Always scoped to the current project via useProject
import { useProject } from "."

export function usePersistentChat() {
	const { selectedProject } = useProject()
	const projectId = selectedProject

	const projectState = usePersistentChatStore((s) => s.byProject[projectId])
	const setCurrentChatIdRaw = usePersistentChatStore((s) => s.setCurrentChatId)
	const setConversationRaw = usePersistentChatStore((s) => s.setConversation)
	const deleteConversationRaw = usePersistentChatStore(
		(s) => s.deleteConversation,
	)
	const setConversationTitleRaw = usePersistentChatStore(
		(s) => s.setConversationTitle,
	)

	const conversations: ConversationSummary[] = (() => {
		const convs = projectState?.conversations ?? {}
		return Object.entries(convs).map(([id, rec]) => ({
			id,
			title: rec.title,
			lastUpdated: rec.lastUpdated,
		}))
	})()

	const currentChatId = projectState?.currentChatId ?? null

	const setCurrentChatId = useCallback(
		(chatId: string | null): void => {
			setCurrentChatIdRaw(projectId, chatId)
		},
		[projectId, setCurrentChatIdRaw],
	)

	const setConversation = useCallback(
		(chatId: string, messages: UIMessage[]): void => {
			setConversationRaw(projectId, chatId, messages)
		},
		[projectId, setConversationRaw],
	)

	const deleteConversation = useCallback(
		(chatId: string): void => {
			deleteConversationRaw(projectId, chatId)
		},
		[projectId, deleteConversationRaw],
	)

	const setConversationTitle = useCallback(
		(chatId: string, title: string | undefined): void => {
			setConversationTitleRaw(projectId, chatId, title)
		},
		[projectId, setConversationTitleRaw],
	)

	const getCurrentConversation = useCallback((): UIMessage[] | undefined => {
		const convs = projectState?.conversations ?? {}
		const id = currentChatId
		if (!id) return undefined
		return convs[id]?.messages
	}, [projectState?.conversations, currentChatId])

	const getCurrentChat = useCallback((): ConversationSummary | undefined => {
		const id = currentChatId
		if (!id) return undefined
		const rec = projectState?.conversations?.[id]
		if (!rec) return undefined
		return { id, title: rec.title, lastUpdated: rec.lastUpdated }
	}, [currentChatId, projectState?.conversations])

	return {
		conversations,
		currentChatId,
		setCurrentChatId,
		setConversation,
		deleteConversation,
		setConversationTitle,
		getCurrentConversation,
		getCurrentChat,
	}
}
