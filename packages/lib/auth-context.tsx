"use client"

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react"
import { authClient, useSession } from "./auth"

type Organization = typeof authClient.$Infer.ActiveOrganization
type SessionData = NonNullable<ReturnType<typeof useSession>["data"]>

interface AuthContextType {
	session: SessionData["session"] | null
	user: SessionData["user"] | null
	org: Organization | null
	setActiveOrg: (orgSlug: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const { data: session } = useSession()
	const [org, setOrg] = useState<Organization | null>(null)

	useEffect(() => {
		if (session?.session.activeOrganizationId) {
			authClient.organization.getFullOrganization().then((org) => {
				setOrg(org)
			})
		}
	}, [session?.session.activeOrganizationId])

	// When a session exists and there is a pending login method recorded,
	// promote it to the last-used method (successful login) and clear pending.
	useEffect(() => {
		if (typeof window === "undefined") return
		if (!session?.session) return

		try {
			const pendingMethod = localStorage.getItem(
				"supermemory-pending-login-method",
			)
			const pendingTsRaw = localStorage.getItem(
				"supermemory-pending-login-timestamp",
			)

			if (pendingMethod) {
				const now = Date.now()
				const ts = pendingTsRaw ? Number.parseInt(pendingTsRaw, 10) : NaN
				const isFresh = Number.isFinite(ts) && now - ts < 10 * 60 * 1000 // 10 minutes TTL

				if (isFresh) {
					localStorage.setItem(
						"supermemory-last-login-method",
						pendingMethod,
					)
				}
			}
		} catch { }
		// Always clear pending markers once a session is present
		try {
			localStorage.removeItem("supermemory-pending-login-method")
			localStorage.removeItem("supermemory-pending-login-timestamp")
		} catch { }
	}, [session?.session])

	const setActiveOrg = async (slug: string) => {
		if (!slug) return

		const activeOrg = await authClient.organization.setActive({
			organizationSlug: slug,
		})
		setOrg(activeOrg)
	}

	return (
		<AuthContext.Provider
			value={{
				org,
				session: session?.session ?? null,
				user: session?.user ?? null,
				setActiveOrg,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider")
	}
	return context
}
