import { useCallback } from "react"
import { useApp } from "./useApp"

/**
 * Convenience wrapper around `app.sendLog` that swallows transport errors —
 * widgets shouldn't crash because the host couldn't accept a log message.
 */
export function useLog() {
	const { log } = useApp()
	return useCallback(
		(level: "debug" | "info" | "warning" | "error", message: string) => {
			log(level, message).catch(() => {
				/* host may not support logging — ignore */
			})
		},
		[log],
	)
}
