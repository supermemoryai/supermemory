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
    // Only trigger logout for authentication-related requests to avoid logging users out on unrelated 401s.
    const origFetch = window.fetch

    // Prevent wrapping multiple times
    if ((window as any).__supermemory_fetch_wrapped) return () => {}

    const isAuthRequest = (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        // Resolve URL string from possible input types
        let urlStr: string
        if (typeof input === "string") urlStr = input
        else if (input instanceof URL) urlStr = input.toString()
        else urlStr = (input as Request).url

        const url = new URL(urlStr, window.location.origin)
        const path = url.pathname

        // Whitelist common auth-related path segments.
        const AUTH_PATH_PATTERNS = [
          "/api/auth",
          "/auth",
          "/api/session",
          "/api/login",
          "/api/logout",
          "/oauth",
          "/token",
        ]
        if (AUTH_PATH_PATTERNS.some((p) => path.includes(p))) return true

        // Also treat requests with an Authorization header as auth-protected
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
        if (headers.get("authorization") || headers.get("Authorization")) return true

        return false
      } catch (err) {
        // If we can't parse the URL safely, don't trigger a logout
        return false
      }
    }

    const customFetch = Object.assign(
      async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const response = await origFetch(input, init)
        if (response.status === 401 && isAuthRequest(input, init)) {
          try {
            // notify other tabs and redirect this tab to login
            localStorage.setItem("supermemory-logout", Date.now().toString())
            window.location.href = "/login"
          } catch (err) {
            // ignore any storage/navigation errors
          }
        }
        return response
      },
      origFetch
    )

    window.fetch = customFetch
    ;(window as any).__supermemory_fetch_wrapped = true

    return () => {
      window.fetch = origFetch
      ;(window as any).__supermemory_fetch_wrapped = false
    }
  }, [router])

  return null
}
