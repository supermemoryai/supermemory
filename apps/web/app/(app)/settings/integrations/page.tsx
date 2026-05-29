"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function SettingsIntegrationsPage() {
	const router = useRouter()
	const searchParams = useSearchParams()

	useEffect(() => {
		const params = new URLSearchParams(searchParams.toString())
		params.set("view", "integrations")
		router.replace(`/?${params.toString()}`)
	}, [router, searchParams])

	return null
}
