"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function SettingsIntegrationsPage() {
	const router = useRouter()
	const searchParams = useSearchParams()

	useEffect(() => {
		const qs = searchParams.toString()
		router.replace(`/settings${qs ? `?${qs}` : ""}#integrations`)
	}, [router, searchParams])

	return null
}
