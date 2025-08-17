import { useEffect } from "react"

export const useKeyPress = (key: string, callback: () => void) => {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === key && e.altKey) {
				callback()
			}
		}
		window.addEventListener("keydown", handler)
		return () => {
			window.removeEventListener("keydown", handler)
		}
	}, [key, callback])
}
