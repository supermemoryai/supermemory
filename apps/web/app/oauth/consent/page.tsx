"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { authClient, useSession } from "@lib/auth"
import { cn } from "@lib/utils"
import { LogoFull } from "@ui/assets/Logo"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"
import { Building2, Check, ChevronDown, LoaderIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

const API_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

function OAuthConsentContent() {
	const params = useSearchParams()
	const { data: session } = useSession()
	const { data: organizations } = authClient.useListOrganizations()
	const [submitting, setSubmitting] = useState<"approve" | "deny" | null>(null)
	const [done, setDone] = useState<"approved" | "denied" | null>(null)
	const [orgMenuOpen, setOrgMenuOpen] = useState(false)
	const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const activeOrgId = session?.session.activeOrganizationId ?? null
	const activeOrgName =
		organizations?.find((o) => o.id === activeOrgId)?.name ?? null
	const canSwitchOrg = (organizations?.length ?? 0) > 1
	const clientId = params.get("client_id") ?? ""
	const scopes = (params.get("scope") ?? "").split(/\s+/).filter(Boolean)
	// A valid consent page is reached only via /oauth2/authorize, which appends a
	// signed (`sig`) + short-lived (`exp`) query. Without that it can't succeed.
	const expSeconds = Number(params.get("exp"))
	const requestExpired = expSeconds > 0 && expSeconds * 1000 < Date.now()
	const invalidRequest = !params.get("sig") || requestExpired

	async function changeOrg(orgId: string) {
		if (!orgId || orgId === activeOrgId) return
		setSwitchingOrgId(orgId)
		try {
			await authClient.organization.setActive({ organizationId: orgId })
			setOrgMenuOpen(false)
		} catch (err) {
			console.error("Failed to switch organization:", err)
		} finally {
			setSwitchingOrgId(null)
		}
	}

	async function submit(accept: boolean) {
		// Send the raw, unmodified query string — better-auth re-verifies its HMAC,
		// so it must be byte-for-byte what we were redirected with (not re-serialized).
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
			const res = await fetch(`${API_URL}/api/auth/oauth2/consent`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				// Omit `scope` → better-auth accepts all originally-requested scopes
				// (we don't offer per-scope toggles, and sending a mismatched list 400s).
				body: JSON.stringify({ accept, oauth_query: oauthQuery }),
			})
			const data = (await res.json().catch(() => ({}))) as {
				url?: string
				redirectURI?: string
				redirect_uri?: string
				redirect?: boolean
				message?: string
				error?: string
				error_description?: string
			}
			if (!res.ok) {
				// The signed authorize query is short-lived (~10 min) and bound to the
				// auth server's secret — a stale/expired consent page fails here.
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
			// Show the final state regardless: many clients use a loopback or custom
			// scheme (cursor://) redirect_uri that hands off without replacing this tab.
			setDone(accept ? "approved" : "denied")
			const redirectUrl = data.url ?? data.redirectURI ?? data.redirect_uri
			if (redirectUrl) window.location.href = redirectUrl
		} catch (err) {
			console.error("OAuth consent failed:", err)
			setError(err instanceof Error ? err.message : "Authorization failed.")
			setSubmitting(null)
		}
	}

	if (done || invalidRequest) {
		const title = done
			? done === "approved"
				? "Access authorized"
				: "Access denied"
			: requestExpired
				? "This request has expired"
				: "No authorization request"
		const subtitle = done
			? "You can return to your app — it's safe to close this tab."
			: "Start the connection again from your app — this page only works as part of that flow."
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div
					className={cn(
						"w-full max-w-[420px] rounded-[14px] bg-[#14161A] p-6 text-center shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
						dmSans125ClassName(),
					)}
				>
					<LogoFull className="mx-auto h-5 w-auto text-[#FAFAFA]" />
					<h2 className="mt-5 font-semibold text-[18px] text-[#FAFAFA]">
						{title}
					</h2>
					<p className="mt-1.5 text-[13px] text-[#737373]">{subtitle}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-[520px] rounded-[14px] bg-[#14161A] p-6 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
				<div className="flex flex-col gap-5">
					<div className="flex flex-col gap-4">
						<div className="flex items-center justify-between gap-3">
							<LogoFull className="h-6 w-auto shrink-0 text-[#FAFAFA]" />
							{session?.user && (
								<div className="flex min-w-0 flex-col items-end">
									<p className="truncate text-[12px] text-[#FAFAFA]">
										{session.user.email}
									</p>
									{canSwitchOrg ? (
										<Popover open={orgMenuOpen} onOpenChange={setOrgMenuOpen}>
											<PopoverTrigger
												className={cn(
													"flex max-w-[200px] items-center gap-1 text-[11px] text-[#737373] transition-colors hover:text-[#FAFAFA]",
													dmSans125ClassName(),
												)}
											>
												<span className="truncate">
													{activeOrgName ?? "Select organization"}
												</span>
												<ChevronDown className="size-3 shrink-0" />
											</PopoverTrigger>
											<PopoverContent
												align="end"
												className="w-max min-w-[12rem] max-w-[18rem] rounded-[12px] border-white/10 bg-[#1B1F24] p-1.5 shadow-[0px_4px_16px_rgba(0,0,0,0.4)]"
											>
												{organizations?.map((o) => {
													const isCurrent = o.id === activeOrgId
													const isSwitching = switchingOrgId === o.id
													return (
														<button
															key={o.id}
															type="button"
															disabled={isCurrent || isSwitching}
															onClick={() => changeOrg(o.id)}
															className={cn(
																"flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left transition-colors",
																isCurrent
																	? "bg-white/5"
																	: "cursor-pointer hover:bg-white/5",
																"disabled:cursor-default",
																dmSans125ClassName(),
															)}
														>
															<Building2 className="size-4 shrink-0 text-[#737373]" />
															<div className="flex min-w-0 flex-1 items-center gap-2">
																<p className="truncate text-[13px] text-[#FAFAFA] tracking-[-0.14px]">
																	{o.name}
																</p>
																{isCurrent && (
																	<Check className="size-4 shrink-0 text-[#4BA0FA]" />
																)}
																{isSwitching && (
																	<LoaderIcon className="size-4 shrink-0 animate-spin text-[#4BA0FA]" />
																)}
															</div>
														</button>
													)
												})}
											</PopoverContent>
										</Popover>
									) : activeOrgName ? (
										<p className="truncate text-[11px] text-[#737373]">
											{activeOrgName}
										</p>
									) : null}
								</div>
							)}
						</div>
						<div className="h-px bg-[#1E293B]" />
					</div>

					<div className="text-center">
						<h2 className="font-semibold text-[18px] text-[#FAFAFA]">
							Authorize access
						</h2>
						<p className="mt-1 text-[13px] text-[#737373]">
							An application is requesting access to your Supermemory account.
						</p>
					</div>

					{clientId && (
						<p className="text-center text-[12px] text-[#8B8B8B]">
							Client ID:{" "}
							<code className="break-all text-[#FAFAFA]">{clientId}</code>
						</p>
					)}

					{scopes.length > 0 && (
						<div>
							<p className="mb-1.5 text-[12px] text-[#737373]">
								Requested permissions
							</p>
							<ul className="space-y-1">
								{scopes.map((s) => (
									<li
										key={s}
										className="rounded-md bg-[#0D121A] px-2.5 py-1.5 text-[13px] text-[#8B8B8B]"
									>
										{s}
									</li>
								))}
							</ul>
						</div>
					)}

					{error && <p className="text-[13px] text-red-400">{error}</p>}

					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => submit(false)}
							disabled={submitting !== null}
							className={cn(
								"flex h-11 flex-1 items-center justify-center rounded-[10px]",
								"border border-[#1E293B] bg-[#0D121A] text-[#FAFAFA]",
								"font-medium text-[14px] tracking-[-0.14px]",
								"cursor-pointer transition-colors hover:bg-[#1E293B]",
								"disabled:cursor-not-allowed disabled:opacity-60",
								dmSans125ClassName(),
							)}
						>
							{submitting === "deny" ? "Cancelling…" : "Deny"}
						</button>
						<button
							type="button"
							onClick={() => submit(true)}
							disabled={submitting !== null}
							className={cn(
								"relative flex h-11 flex-1 items-center justify-center rounded-[10px]",
								"font-medium text-[14px] text-[#FAFAFA] tracking-[-0.14px]",
								"cursor-pointer transition-opacity hover:opacity-90",
								"disabled:cursor-not-allowed disabled:opacity-60",
								dmSans125ClassName(),
							)}
							style={{
								background:
									"linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%)",
								boxShadow:
									"1px 1px 2px 0px #1A88FF inset, 0 2px 10px 0 rgba(5, 1, 0, 0.20)",
							}}
						>
							{submitting === "approve" ? "Authorizing…" : "Approve"}
							<div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function OAuthConsentPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-background">
					<div className="size-6 animate-spin rounded-full border-2 border-[#4BA0FA] border-t-transparent" />
				</div>
			}
		>
			<OAuthConsentContent />
		</Suspense>
	)
}
