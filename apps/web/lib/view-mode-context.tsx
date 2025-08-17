"use client"

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react"
import { analytics } from "@/lib/analytics"

type ViewMode = "graph" | "list"

interface ViewModeContextType {
	viewMode: ViewMode
	setViewMode: (mode: ViewMode) => void
	isInitialized: boolean
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(
	undefined,
)

// Cookie utility functions
const setCookie = (name: string, value: string, days = 365) => {
	if (typeof document === "undefined") return
	const expires = new Date()
	expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
	document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

const getCookie = (name: string): string | null => {
	if (typeof document === "undefined") return null
	const nameEQ = `${name}=`
	const ca = document.cookie.split(";")
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i]
		if (!c) continue
		while (c.charAt(0) === " ") c = c.substring(1, c.length)
		if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
	}
	return null
}

const isMobileDevice = () => {
	if (typeof window === "undefined") return false
	return window.innerWidth < 768
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
	// Start with a default that works for SSR
	const [viewMode, setViewModeState] = useState<ViewMode>("graph")
	const [isInitialized, setIsInitialized] = useState(false)

	// Load preferences on the client side
	useEffect(() => {
		if (!isInitialized) {
			// Check for saved preference first
			const savedMode = getCookie("memoryViewMode")
			if (savedMode === "list" || savedMode === "graph") {
				setViewModeState(savedMode)
			} else {
				// If no saved preference, default to list on mobile, graph on desktop
				setViewModeState(isMobileDevice() ? "list" : "graph")
			}
			setIsInitialized(true)
		}
	}, [isInitialized])

	// Save to cookie whenever view mode changes
	const handleSetViewMode = (mode: ViewMode) => {
		analytics.viewModeChanged(mode)
		setViewModeState(mode)
		setCookie("memoryViewMode", mode)
	}

	return (
		<ViewModeContext.Provider
			value={{
				viewMode,
				setViewMode: handleSetViewMode,
				isInitialized,
			}}
		>
			{children}
		</ViewModeContext.Provider>
	)
}

export function useViewMode() {
	const context = useContext(ViewModeContext)
	if (!context) {
		throw new Error("useViewMode must be used within a ViewModeProvider")
	}
	return context
}
