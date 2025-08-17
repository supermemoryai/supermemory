"use client"

import { createContext, type ReactNode, useContext, useState } from "react"

type ActivePanel = "menu" | "chat" | null

interface MobilePanelContextType {
	activePanel: ActivePanel
	setActivePanel: (panel: ActivePanel) => void
}

const MobilePanelContext = createContext<MobilePanelContextType | undefined>(
	undefined,
)

export function MobilePanelProvider({ children }: { children: ReactNode }) {
	const [activePanel, setActivePanel] = useState<ActivePanel>(null)

	return (
		<MobilePanelContext.Provider value={{ activePanel, setActivePanel }}>
			{children}
		</MobilePanelContext.Provider>
	)
}

export function useMobilePanel() {
	const context = useContext(MobilePanelContext)
	if (!context) {
		throw new Error("useMobilePanel must be used within a MobilePanelProvider")
	}
	return context
}
