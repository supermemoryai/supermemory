"use client"

import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { createAuthSessionScope } from "@lib/scoped-auth-state"
import { useSearchParams } from "next/navigation"
import {
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react"
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
	const { organizations, user } = useAuth()

	const [submitting, setSubmitting] = useState<"approve" | "deny" | null>(null)
	const [done, setDone] = useState<"approved" | "denied" | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [availableTags, setAvailableTags] = useState<string[]>([])
	const [tagsLoading, setTagsLoading] = useState(false)
	const [tagsLoaded, setTagsLoaded] = useState(false)
	const tagsRequestRef = useRef<AbortController | null>(null)
	const submitRequestRef = useRef<AbortController | null>(null)

	useEffect(() => {
		return () => {
			tagsRequestRef.current?.abort()
			submitRequestRef.current?.abort()
		}
	}, [])

	const orgs = useMemo(
		() => (organizations ?? []).map((o) => ({ id: o.id, name: o.name })),
		[organizations],
	)
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
			tagsRequestRef.current?.abort()
			tagsRequestRef.current = null
			setTagsLoading(false)
			setTagsLoaded(false)
			setAvailableTags([])
			try {
				const result = await authClient.organization.setActive({
					organizationId: orgId,
				})
				if (result.error || result.data?.id !== orgId) {
					throw new Error(
						result.error?.message ?? "Organization switch failed",
					)
				}
			} catch (err) {
				setError("Couldn't switch to that organization. Try again.")
				throw err
			}
		},
		[],
	)

	const onScopedOpen = useCallback(() => {
		if (tagsLoading || tagsLoaded) return
		const controller = new AbortController()
		tagsRequestRef.current?.abort()
		tagsRequestRef.current = controller
		setTagsLoading(true)
		fetch(`${API_URL}/v3/container-tags/list`, {
			credentials: "include",
			signal: controller.signal,
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => {
				if (
					tagsRequestRef.current !== controller ||
					controller.signal.aborted
				) {
					return
				}
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
			.finally(() => {
				if (tagsRequestRef.current !== controller) return
				tagsRequestRef.current = null
				if (!controller.signal.aborted) {
					setTagsLoading(false)
					setTagsLoaded(true)
				}
			})
	}, [tagsLoading, tagsLoaded])

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
			const controller = new AbortController()
			submitRequestRef.current?.abort()
			submitRequestRef.current = controller
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
						signal: controller.signal,
					})
					if (controller.signal.aborted) return
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
					signal: controller.signal,
				})
				if (controller.signal.aborted) return
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
				if (controller.signal.aborted) return
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
				console.log("isSignedInteractionRedirect", isSignedInteractionRedirect)
				console.log("targetUrl", targetUrl)
				console.log("accept", accept)
				console.log("window.location.origin", window.location.origin)
				console.log("pathname", targetUrl.pathname)
				if (accept && isSignedInteractionRedirect) {
					throw new Error(
						"Authorization could not finish because your session changed. Start the connection again from your app.",
					)
				}
				setDone(accept ? "approved" : "denied")
				if (redirectUrl) window.location.href = redirectUrl
			} catch (err) {
				if (controller.signal.aborted) return
				console.error("OAuth consent failed:", err)
				setError(err instanceof Error ? err.message : "Authorization failed.")
				setSubmitting(null)
			} finally {
				if (submitRequestRef.current === controller) {
					submitRequestRef.current = null
				}
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
			userEmail={user?.email}
			verified={!!plugin}
		/>
	)
}

export default function OAuthConsentPage() {
	const { isSessionPending, session, user } = useAuth()
	const sessionScope = createAuthSessionScope({
		isPending: isSessionPending,
		sessionId: session?.id,
		userId: user?.id,
	})

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
			<OAuthConsentContent key={sessionScope ?? "no-session"} />
		</Suspense>
	)
}
