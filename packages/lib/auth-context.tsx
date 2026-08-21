"use client"

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react"
import { authClient, useSession } from "./auth"
import {
	createAuthSessionScope,
	isOAuthConsentPath,
	readScopedAuthValue,
	scopedAuthValueForResponse,
	type ScopedAuthValue,
} from "./scoped-auth-state"

type Organization = typeof authClient.$Infer.ActiveOrganization
type SessionData = NonNullable<ReturnType<typeof useSession>["data"]>
type OrganizationListItem = NonNullable<
	Awaited<ReturnType<typeof authClient.organization.list>>["data"]
>[number]

const STORAGE_KEY = "supermemory-consumer-last-org-slug"

// Reads ?org=<slug> from the URL once and removes it, so a deep link that
// selects an org doesn't re-fire on refresh or back-navigation.
function consumeRequestedOrgSlug(): string | null {
	if (typeof window === "undefined") return null
	const params = new URLSearchParams(window.location.search)
	const slug = params.get("org")
	if (!slug) return null
	params.delete("org")
	const qs = params.toString()
	window.history.replaceState(
		null,
		"",
		`${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
	)
	return slug
}

interface AuthContextType {
	session: SessionData["session"] | null
	user: SessionData["user"] | null
	org: Organization | null
	organizations: OrganizationListItem[] | null
	isRestoring: boolean
	isSessionPending: boolean
	setActiveOrg: (orgSlug: string) => Promise<void>
	clearActiveOrg: () => Promise<void>
	updateOrgMetadata: (partial: Record<string, unknown>) => void
	refetchActiveOrg: () => Promise<Organization | null>
	refetchOrganizations: () => Promise<unknown>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const { data: session, isPending: isSessionPending } = useSession()
	const sessionScope = createAuthSessionScope({
		isPending: isSessionPending,
		sessionId: session?.session.id,
		userId: session?.user.id,
	})
	const currentSessionScopeRef = useRef(sessionScope)
	currentSessionScopeRef.current = sessionScope
	const organizationsRequestRef = useRef(0)
	const [organizationsState, setOrganizationsState] = useState<ScopedAuthValue<
		OrganizationListItem[]
	> | null>(null)
	const [organizationState, setOrganizationState] =
		useState<ScopedAuthValue<Organization | null> | null>(null)

	const organizationsRead = readScopedAuthValue(
		sessionScope,
		organizationsState,
	)
	const organizationRead = readScopedAuthValue(sessionScope, organizationState)
	const organizations = organizationsRead.ready ? organizationsRead.data : null
	const org = organizationRead.ready ? organizationRead.data : null
	const isRestoring =
		isSessionPending ||
		Boolean(
			session?.session &&
				(!sessionScope || !organizationsRead.ready || !organizationRead.ready),
		)

	const refetchOrganizations = useCallback(async () => {
		const requestedScope = currentSessionScopeRef.current
		if (!requestedScope) return null
		const requestId = ++organizationsRequestRef.current
		const commitOrganizations = (data: OrganizationListItem[]) => {
			if (requestId !== organizationsRequestRef.current) return
			const nextState = scopedAuthValueForResponse(
				currentSessionScopeRef.current,
				requestedScope,
				data,
			)
			if (nextState) setOrganizationsState(nextState)
		}

		try {
			const result = await authClient.organization.list()
			commitOrganizations(result.data ?? [])
			return result
		} catch {
			commitOrganizations([])
			return null
		}
	}, [])

	const setActiveOrg = useCallback(async (slug: string) => {
		if (!slug) return
		const requestedScope = currentSessionScopeRef.current
		if (!requestedScope) return

		const res = await authClient.organization.setActive({
			organizationSlug: slug,
		})
		if (res.error || !res.data) {
			throw new Error(res.error?.message ?? "Organization switch failed")
		}
		const nextState = scopedAuthValueForResponse(
			currentSessionScopeRef.current,
			requestedScope,
			res.data,
		)
		if (nextState) {
			setOrganizationState(nextState)
			localStorage.setItem(STORAGE_KEY, slug)
		}
	}, [])

	const clearActiveOrg = useCallback(async () => {
		const requestedScope = currentSessionScopeRef.current
		if (!requestedScope) return
		try {
			await authClient.organization.setActive({ organizationId: null })
		} catch {}
		const nextState = scopedAuthValueForResponse(
			currentSessionScopeRef.current,
			requestedScope,
			null,
		)
		if (nextState) {
			setOrganizationState(nextState)
			try {
				localStorage.removeItem(STORAGE_KEY)
			} catch {}
		}
	}, [])

	const updateOrgMetadata = useCallback((partial: Record<string, unknown>) => {
		const currentScope = currentSessionScopeRef.current
		if (!currentScope) return
		setOrganizationState((prev) => {
			if (prev?.scope !== currentScope || !prev.data) return prev
			return {
				scope: currentScope,
				data: {
					...prev.data,
					metadata: {
						...prev.data.metadata,
						...partial,
					},
				},
			}
		})
	}, [])

	const refetchActiveOrg = useCallback(async () => {
		const requestedScope = currentSessionScopeRef.current
		if (!requestedScope) return null
		const full = await authClient.organization.getFullOrganization()
		const nextOrg = full?.data ?? null
		const nextState = scopedAuthValueForResponse(
			currentSessionScopeRef.current,
			requestedScope,
			nextOrg,
		)
		if (!nextState) return null
		setOrganizationState(nextState)
		return nextState.data
	}, [])

	useEffect(() => {
		if (isSessionPending) return
		if (!sessionScope) {
			setOrganizationsState(null)
			setOrganizationState(null)
			return
		}

		void refetchOrganizations()
	}, [isSessionPending, refetchOrganizations, sessionScope])

	useEffect(() => {
		if (isSessionPending) return
		if (!session?.session || !sessionScope || organizations === null) return

		const requestedScope = sessionScope
		const orgs = organizations
		let cancelled = false
		const commitOrganization = (nextOrg: Organization | null) => {
			if (cancelled) return
			const nextState = scopedAuthValueForResponse(
				currentSessionScopeRef.current,
				requestedScope,
				nextOrg,
			)
			if (nextState) setOrganizationState(nextState)
		}

		const run = async () => {
			try {
				// OAuth consent owns org selection for the authorization transaction.
				const shouldRestoreSavedOrg =
					typeof window === "undefined" ||
					!isOAuthConsentPath(window.location.pathname)

				if (orgs.length === 0) {
					commitOrganization(null)
					return
				}

				const activeOrgId = session.session.activeOrganizationId

				// Deep link (?org=<slug>) takes priority — used when arriving from
				// the console. Strip the param so refresh/back doesn't re-trigger.
				const requestedSlug = consumeRequestedOrgSlug()
				if (requestedSlug) {
					const match = orgs.find((o) => o.slug === requestedSlug)
					if (match) {
						if (activeOrgId === match.id) {
							const full = await authClient.organization.getFullOrganization()
							commitOrganization(full?.data ?? null)
						} else {
							await setActiveOrg(requestedSlug)
						}
						return
					}
				}

				if (orgs.length === 1) {
					const one = orgs[0]
					if (!one) return
					if (activeOrgId === one.id) {
						const full = await authClient.organization.getFullOrganization()
						commitOrganization(full?.data ?? null)
					} else {
						await setActiveOrg(one.slug)
					}
					return
				}

				if (shouldRestoreSavedOrg) {
					const savedSlug = localStorage.getItem(STORAGE_KEY)
					if (savedSlug) {
						const match = orgs.find((o) => o.slug === savedSlug)
						if (match) {
							if (activeOrgId === match.id) {
								const full = await authClient.organization.getFullOrganization()
								commitOrganization(full?.data ?? null)
							} else {
								await setActiveOrg(savedSlug)
							}
							return
						}
						localStorage.removeItem(STORAGE_KEY)
					}
				}

				if (activeOrgId) {
					const fromList = orgs.find((o) => o.id === activeOrgId)
					if (fromList) {
						const full = await authClient.organization.getFullOrganization()
						commitOrganization(full?.data ?? null)
						return
					}
				}

				const full = await authClient.organization.getFullOrganization()
				commitOrganization(full?.data ?? null)
			} catch (error) {
				console.error("Failed to restore organization:", error)
				commitOrganization(null)
			}
		}

		void run()
		return () => {
			cancelled = true
		}
	}, [
		isSessionPending,
		organizations,
		session?.session,
		sessionScope,
		setActiveOrg,
	])

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
				refetchActiveOrg,
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
