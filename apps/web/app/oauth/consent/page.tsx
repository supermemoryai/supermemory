"use client"

import { authClient, useSession } from "@lib/auth"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useMemo, useState } from "react"
import {
	CardShell,
	ConsentCard,
	type ConsentScope,
	FullScreenMessage,
	OAUTH_PLUGINS,
} from "./ConsentCard"

const API_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

function OAuthConsentContent() {
	const params = useSearchParams()
	const { data: session } = useSession()
	const { data: organizations } = authClient.useListOrganizations()

	const [submitting, setSubmitting] = useState<"approve" | "deny" | null>(null)
	const [done, setDone] = useState<"approved" | "denied" | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [availableTags, setAvailableTags] = useState<string[]>([])
	const [tagsLoading, setTagsLoading] = useState(false)

	const orgs = useMemo(
		() => (organizations ?? []).map((o) => ({ id: o.id, name: o.name })),
		[organizations],
	)
	const activeOrgId = session?.session.activeOrganizationId ?? null
	const clientId = params.get("client_id") ?? ""
	const plugin = clientId ? (OAUTH_PLUGINS[clientId] ?? null) : null
	const appLabel = plugin?.name ?? "An application"

	// A valid consent page is reached only via /oauth2/authorize, which appends a
	// signed (`sig`) + short-lived (`exp`) query. Without that it can't succeed.
	const expSeconds = Number(params.get("exp"))
	const requestExpired = expSeconds > 0 && expSeconds * 1000 < Date.now()
	const invalidRequest = !params.get("sig") || requestExpired

	const onEnterOrg = useCallback(
		async (orgId: string) => {
			setError(null)
			if (orgId !== activeOrgId) {
				try {
					await authClient.organization.setActive({ organizationId: orgId })
				} catch (err) {
					setError("Couldn't switch to that organization. Try again.")
					throw err
				}
			}
			setAvailableTags([])
		},
		[activeOrgId],
	)

	const onScopedOpen = useCallback(() => {
		if (tagsLoading || availableTags.length > 0) return
		setTagsLoading(true)
		fetch(`${API_URL}/v3/container-tags/list`, { credentials: "include" })
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => {
				const list = (d?.containerTags ?? d?.tags ?? d ?? []) as unknown[]
				const names = (Array.isArray(list) ? list : [])
					.map((t) =>
						typeof t === "string"
							? t
							: ((t as { containerTag?: string; tag?: string })?.containerTag ??
								(t as { tag?: string })?.tag ??
								null),
					)
					.filter((t): t is string => typeof t === "string" && t.length > 0)
				setAvailableTags(Array.from(new Set(names)))
			})
			.catch(() => {})
			.finally(() => setTagsLoading(false))
	}, [tagsLoading, availableTags.length])

	const onSubmit = useCallback(
		async (accept: boolean, scope: ConsentScope) => {
			// Send the raw, unmodified query string — better-auth re-verifies its HMAC,
			// so it must be byte-for-byte what we were redirected with.
			const oauthQuery = window.location.search.replace(/^\?/, "")
			if (!oauthQuery) {
				setError(
					"Missing authorization request. Start the flow again from your app.",
				)
				return
			}
			setSubmitting(accept ? "approve" : "deny")
			setError(null)
			try {
				if (accept && clientId) {
					const scopeRes = await fetch(`${API_URL}/v3/mcp/connect-scope`, {
						method: "POST",
						credentials: "include",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						body: JSON.stringify({
							clientId,
							permission: scope.permission,
							containerTags: scope.scopeType === "scoped" ? scope.tags : [],
							expiresDays: scope.expiresDays,
						}),
					})
					if (!scopeRes.ok) {
						const scopeData = (await scopeRes.json().catch(() => ({}))) as {
							error?: string
							message?: string
						}
						throw new Error(
							scopeData.message ||
								scopeData.error ||
								"Could not save MCP access settings. Start the connection again.",
						)
					}
				}
				const res = await fetch(`${API_URL}/api/auth/oauth2/consent`, {
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: JSON.stringify({ accept, oauth_query: oauthQuery }),
				})
				const data = (await res.json().catch(() => ({}))) as {
					url?: string
					redirectURI?: string
					redirect_uri?: string
					message?: string
					error?: string
					error_description?: string
				}
				if (!res.ok) {
					if (
						data.error === "invalid_signature" ||
						data.error === "invalid_request"
					) {
						throw new Error(
							"This authorization request has expired. Start the connection again from your app.",
						)
					}
					throw new Error(
						data.error_description ||
							data.message ||
							data.error ||
							"Authorization failed.",
					)
				}
				// Many clients use a loopback or custom-scheme redirect URI that hands
				// off without replacing this tab, but the server still has to provide it.
				const redirectUrl = data.url ?? data.redirectURI ?? data.redirect_uri
				if (!redirectUrl) {
					throw new Error(
						"Authorization completed but no redirect URL was returned. Start the connection again from your app.",
					)
				}
				const targetUrl = new URL(redirectUrl, window.location.href)
				const isSignedInteractionRedirect =
					targetUrl.origin === window.location.origin &&
					(targetUrl.pathname === "/login" ||
						targetUrl.pathname === "/oauth/consent") &&
					targetUrl.searchParams.has("sig") &&
					targetUrl.searchParams.has("exp")
				if (accept && isSignedInteractionRedirect) {
					throw new Error(
						"Authorization could not finish because your session changed. Start the connection again from your app.",
					)
				}
				setDone(accept ? "approved" : "denied")
				if (redirectUrl) window.location.href = redirectUrl
			} catch (err) {
				console.error("OAuth consent failed:", err)
				setError(err instanceof Error ? err.message : "Authorization failed.")
				setSubmitting(null)
			}
		},
		[clientId],
	)

	const onSignOut = useCallback(async () => {
		try {
			await authClient.signOut()
		} catch {}
		window.location.href = "/login"
	}, [])

	if (invalidRequest && !done) {
		return (
			<FullScreenMessage
				subtitle="Start the connection again from your app — this page only works as part of that flow."
				title={
					requestExpired
						? "This request has expired"
						: "No authorization request"
				}
			/>
		)
	}

	if (done) {
		return (
			<FullScreenMessage
				subtitle="You can return to your app — it's safe to close this tab."
				title={done === "approved" ? "Access authorized" : "Access denied"}
			/>
		)
	}

	return (
		<ConsentCard
			appLabel={appLabel}
			availableTags={availableTags}
			clientId={clientId}
			error={error}
			onEnterOrg={onEnterOrg}
			onScopedOpen={onScopedOpen}
			onSignOut={onSignOut}
			onSubmit={onSubmit}
			orgs={orgs}
			submitting={submitting}
			tagsLoading={tagsLoading}
			userEmail={session?.user?.email}
			verified={!!plugin}
		/>
	)
}

export default function OAuthConsentPage() {
	return (
		<Suspense
			fallback={
				<CardShell>
					<div className="flex h-40 items-center justify-center">
						<div className="size-6 animate-spin rounded-full border-2 border-[#4BA0FA] border-t-transparent" />
					</div>
				</CardShell>
			}
		>
			<OAuthConsentContent />
		</Suspense>
	)
}
