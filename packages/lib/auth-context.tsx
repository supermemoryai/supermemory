"use client"

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react"
import { authClient, useSession } from "./auth"

type Organization = typeof authClient.$Infer.ActiveOrganization
type SessionData = NonNullable<ReturnType<typeof useSession>["data"]>
type OrganizationListItem = NonNullable<
	ReturnType<typeof authClient.useListOrganizations>["data"]
>[number]

const STORAGE_KEY = "supermemory-consumer-last-org-slug"

interface AuthContextType {
	session: SessionData["session"] | null
	user: SessionData["user"] | null
	org: Organization | null
	organizations: OrganizationListItem[] | null
	isRestoring: boolean
	isSessionPending: boolean
	setActiveOrg: (orgSlug: string) => Promise<void>
	clearActiveOrg: () => void
	updateOrgMetadata: (partial: Record<string, unknown>) => void
	refetchOrganizations: () => Promise<unknown>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const { data: session, isPending: isSessionPending } = useSession()
	const [org, setOrg] = useState<Organization | null>(null)
	const [isRestoring, setIsRestoring] = useState(true)
	const {
		data: orgsData,
		refetch: refetchOrgsQuery,
		isPending: orgsPending,
	} = authClient.useListOrganizations()

	const organizations =
		session?.session == null ? null : orgsPending ? null : (orgsData ?? [])

	const refetchOrganizations = useCallback(
		() => Promise.resolve(refetchOrgsQuery()),
		[refetchOrgsQuery],
	)

	const setActiveOrg = useCallback(async (slug: string) => {
		if (!slug) return

		const res = await authClient.organization.setActive({
			organizationSlug: slug,
		})
		setOrg(res?.data ?? null)
		localStorage.setItem(STORAGE_KEY, slug)
	}, [])

	const clearActiveOrg = useCallback(() => {
		setOrg(null)
		try {
			localStorage.removeItem(STORAGE_KEY)
		} catch {}
	}, [])

	const updateOrgMetadata = useCallback((partial: Record<string, unknown>) => {
		setOrg((prev) => {
			if (!prev) return prev
			return {
				...prev,
				metadata: {
					...prev.metadata,
					...partial,
				},
			}
		})
	}, [])

	useEffect(() => {
		if (isSessionPending) return

		if (!session?.session) {
			setIsRestoring(false)
			setOrg(null)
			return
		}

		if (orgsPending || orgsData === undefined) {
			setIsRestoring(true)
			return
		}

		const orgs = orgsData ?? []
		let cancelled = false

		const run = async () => {
			try {
				if (orgs.length === 0) {
					if (!cancelled) setOrg(null)
					return
				}

				const activeOrgId = session.session.activeOrganizationId

				if (orgs.length === 1) {
					const one = orgs[0]
					if (!one) return
					if (activeOrgId === one.id) {
						const full = await authClient.organization.getFullOrganization()
						if (!cancelled) setOrg(full?.data ?? null)
					} else {
						await setActiveOrg(one.slug)
					}
					return
				}

				const savedSlug = localStorage.getItem(STORAGE_KEY)
				if (savedSlug) {
					const match = orgs.find((o) => o.slug === savedSlug)
					if (match) {
						if (activeOrgId === match.id) {
							const full = await authClient.organization.getFullOrganization()
							if (!cancelled) setOrg(full?.data ?? null)
						} else {
							await setActiveOrg(savedSlug)
						}
						return
					}
					localStorage.removeItem(STORAGE_KEY)
				}

				if (activeOrgId) {
					const fromList = orgs.find((o) => o.id === activeOrgId)
					if (fromList) {
						const full = await authClient.organization.getFullOrganization()
						if (!cancelled) setOrg(full?.data ?? null)
						return
					}
				}

				const full = await authClient.organization.getFullOrganization()
				if (!cancelled) setOrg(full?.data ?? null)
			} catch (error) {
				console.error("Failed to restore organization:", error)
			} finally {
				if (!cancelled) setIsRestoring(false)
			}
		}

		void run()
		return () => {
			cancelled = true
		}
	}, [isSessionPending, session, orgsData, orgsPending, setActiveOrg])

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
				const isFresh = Number.isFinite(ts) && now - ts < 10 * 60 * 1000

				if (isFresh) {
					localStorage.setItem("supermemory-last-login-method", pendingMethod)
				}
			}
		} catch {}
		try {
			localStorage.removeItem("supermemory-pending-login-method")
			localStorage.removeItem("supermemory-pending-login-timestamp")
		} catch {}
	}, [session?.session])

	return (
		<AuthContext.Provider
			value={{
				org,
				organizations,
				isRestoring,
				isSessionPending,
				session: session?.session ?? null,
				user: session?.user ?? null,
				setActiveOrg,
				clearActiveOrg,
				updateOrgMetadata,
				refetchOrganizations,
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
