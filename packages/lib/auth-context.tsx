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
	// Check for Auth Agent session cookie
	const [isAuthAgentSession, setIsAuthAgentSession] = useState(false)
	const [authAgentData, setAuthAgentData] = useState<any>(null)

	useEffect(() => {
		if (typeof window !== "undefined") {
			const cookies = document.cookie
			const hasAuthAgentSession = cookies.includes("auth_agent_session")
			setIsAuthAgentSession(hasAuthAgentSession)

			if (hasAuthAgentSession) {
				// Extract Auth Agent session data from cookie
				const match = cookies.match(/auth_agent_session=([^;]+)/)
				if (match) {
					try {
						const sessionData = JSON.parse(decodeURIComponent(match[1]))
						setAuthAgentData(sessionData)
					} catch (e) {
						console.error("Failed to parse auth_agent_session cookie:", e)
					}
				}
			}
		}
	}, [])

	const { data: session } = useSession()
	const [org, setOrg] = useState<Organization | null>(null)
	// Only fetch organizations if NOT an Auth Agent session
	const { data: orgs } = authClient.useListOrganizations({
		query: {
			enabled: !isAuthAgentSession,
		},
	})

	const setActiveOrg = async (slug: string) => {
		if (!slug) return

		const activeOrg = await authClient.organization.setActive({
			organizationSlug: slug,
		})
		setOrg(activeOrg)
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: ignoring the setActiveOrg dependency
	useEffect(() => {
		if (session?.session.activeOrganizationId) {
			authClient.organization
				.getFullOrganization()
				.then((org) => {
					if (org.metadata?.isConsumer === true) {
						console.log("Consumer organization:", org)
					   setOrg(org)
					} else {
						console.log("ALl orgs:", orgs)
						const consumerOrg = orgs?.find((o) => o.metadata?.isConsumer === true)
						if (consumerOrg) {
							setActiveOrg(consumerOrg.slug)
						}
					}
				})
				.catch((error) => {
					// Silently handle organization fetch failures to prevent unhandled rejections
					console.error("Failed to fetch organization:", error)
				})
		}
	}, [session?.session.activeOrganizationId, orgs])

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
				const ts = pendingTsRaw ? Number.parseInt(pendingTsRaw, 10) : Number.NaN
				const isFresh = Number.isFinite(ts) && now - ts < 10 * 60 * 1000 // 10 minutes TTL

				if (isFresh) {
					localStorage.setItem("supermemory-last-login-method", pendingMethod)
				}
			}
		} catch {}
		// Always clear pending markers once a session is present
		try {
			localStorage.removeItem("supermemory-pending-login-method")
			localStorage.removeItem("supermemory-pending-login-timestamp")
		} catch {}
	}, [session?.session])

	// If Auth Agent session exists, provide mock data
	if (isAuthAgentSession && authAgentData) {
		const mockSession = {
			id: authAgentData.agentId,
			userId: authAgentData.agentId,
			token: authAgentData.authCode,
			expiresAt: new Date(authAgentData.expiresAt),
			createdAt: new Date(authAgentData.authenticatedAt),
			updatedAt: new Date(authAgentData.authenticatedAt),
			ipAddress: null,
			userAgent: null,
			activeOrganizationId: null,
		}

		const mockUser = {
			id: authAgentData.agentId,
			email: `${authAgentData.agentId}@auth-agent.local`,
			name: `AI Agent (${authAgentData.model})`,
			emailVerified: true,
			image: null,
			createdAt: new Date(authAgentData.authenticatedAt),
			updatedAt: new Date(authAgentData.authenticatedAt),
		}

		return (
			<AuthContext.Provider
				value={{
					org: null,
					session: mockSession as any,
					user: mockUser as any,
					setActiveOrg: async () => {},
				}}
			>
				{children}
			</AuthContext.Provider>
		)
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
