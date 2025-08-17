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
