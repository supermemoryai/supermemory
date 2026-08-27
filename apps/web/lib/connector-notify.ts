"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { analytics } from "@/lib/analytics"
import { connectorPause } from "@/lib/connector-availability"

const key = (provider: string) => `connector_notify:${provider}`

// Per-browser only. The PostHog event is the record of truth for who to email.
export function useConnectorNotify() {
	const [requested, setRequested] = useState<Record<string, boolean>>({})

	useEffect(() => {
		try {
			const seen: Record<string, boolean> = {}
			for (let i = 0; i < localStorage.length; i++) {
				const k = localStorage.key(i)
				if (k?.startsWith("connector_notify:")) {
					seen[k.slice("connector_notify:".length)] = true
				}
			}
			setRequested(seen)
		} catch {}
	}, [])

	const isRequested = useCallback(
		(provider: string) => requested[provider] === true,
		[requested],
	)

	const request = useCallback((provider: string) => {
		const pause = connectorPause(provider)
		if (!pause) return
		analytics.connectorPausedClicked({ provider, reason: pause.reason })
		try {
			localStorage.setItem(key(provider), "1")
		} catch {}
		setRequested((prev) => ({ ...prev, [provider]: true }))
		toast.success(`We'll email you when ${pause.label} is back.`)
	}, [])

	return { isRequested, request }
}
