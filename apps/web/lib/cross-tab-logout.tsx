"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Hook to synchronize logout across browser tabs and handle 401 Unauthorized globally.
 *
 * Usage: Place <CrossTabLogoutHandler /> at the root of your app (e.g. in layout.tsx).
 */
export function CrossTabLogoutHandler() {
  const router = useRouter()

  useEffect(() => {
    // Listen for logout events from other tabs
    function onStorage(e: StorageEvent) {
      if (e.key === "supermemory-logout") {
        // Clear session and redirect to login
        router.push("/login")
        // Optionally, reload to clear all state
        window.location.reload()
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [router])

  useEffect(() => {
    // Optionally, listen for 401 responses globally (if using fetch)
    // You can patch window.fetch here to catch 401s and trigger logout
    const origFetch = window.fetch
    const customFetch = Object.assign(
      async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const response = await origFetch(input, init)
        if (response.status === 401) {
          localStorage.setItem("supermemory-logout", Date.now().toString())
          window.location.href = "/login"
        }
        return response
      },
      origFetch
    )
    window.fetch = customFetch
    return () => {
      window.fetch = origFetch
    }
  }, [router])

  return null
}
