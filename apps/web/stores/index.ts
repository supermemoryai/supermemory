import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ProjectState {
	selectedProject: string
	setSelectedProject: (projectId: string) => void
}

export const useProjectStore = create<ProjectState>()(
	persist(
		(set) => ({
			selectedProject: "sm_project_default",
			setSelectedProject: (projectId) => set({ selectedProject: projectId }),
		}),
		{
			name: "selectedProject",
		},
	),
)

interface MemoryGraphState {
	positionX: number
	positionY: number
	setPositionX: (x: number) => void
	setPositionY: (y: number) => void
	setPosition: (x: number, y: number) => void
}

export const useMemoryGraphStore = create<MemoryGraphState>()((set) => ({
	positionX: 0,
	positionY: 0,
	setPositionX: (x) => set({ positionX: x }),
	setPositionY: (y) => set({ positionY: y }),
	setPosition: (x, y) => set({ positionX: x, positionY: y }),
}))

interface ChatState {
	isOpen: boolean
	setIsOpen: (isOpen: boolean) => void
	toggleChat: () => void
}

export const useChatStore = create<ChatState>()((set, get) => ({
	isOpen: false,
	setIsOpen: (isOpen) => set({ isOpen }),
	toggleChat: () => set({ isOpen: !get().isOpen }),
}))

export function useProject() {
	const selectedProject = useProjectStore((state) => state.selectedProject)
	const setSelectedProject = useProjectStore(
		(state) => state.setSelectedProject,
	)
	return { selectedProject, setSelectedProject }
}

export function useMemoryGraphPosition() {
	const positionX = useMemoryGraphStore((state) => state.positionX)
	const positionY = useMemoryGraphStore((state) => state.positionY)
	const setPositionX = useMemoryGraphStore((state) => state.setPositionX)
	const setPositionY = useMemoryGraphStore((state) => state.setPositionY)
	const setPosition = useMemoryGraphStore((state) => state.setPosition)

	return {
		x: positionX,
		y: positionY,
		setX: setPositionX,
		setY: setPositionY,
		setPosition,
	}
}

export function useChatOpen() {
	const isOpen = useChatStore((state) => state.isOpen)
	const setIsOpen = useChatStore((state) => state.setIsOpen)
	const toggleChat = useChatStore((state) => state.toggleChat)
	return { isOpen, setIsOpen, toggleChat }
}

interface GraphModalState {
	isOpen: boolean
	setIsOpen: (isOpen: boolean) => void
	toggleGraphModal: () => void
}

export const useGraphModalStore = create<GraphModalState>()((set, get) => ({
	isOpen: false,
	setIsOpen: (isOpen) => set({ isOpen }),
	toggleGraphModal: () => set({ isOpen: !get().isOpen }),
}))

export function useGraphModal() {
	const isOpen = useGraphModalStore((state) => state.isOpen)
	const setIsOpen = useGraphModalStore((state) => state.setIsOpen)
	const toggleGraphModal = useGraphModalStore((state) => state.toggleGraphModal)
	return { isOpen, setIsOpen, toggleGraphModal }
}

export { usePersistentChat, usePersistentChatStore } from "./chat"
