"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { OAUTH_PLUGINS } from "@/lib/oauth-plugins"
import { cn } from "@lib/utils"
import { Building2, ExternalLink, LoaderIcon, Plug, Trash2 } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

const API_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

interface Connection {
	clientId: string
	name: string
	icon: string | null
	isFirstParty: boolean
	workspaceId: string | null
	workspaceName: string | null
	scopes: string[]
	connectedAt: string | null
	lastUsedAt: string | null
}

function relativeTime(iso: string | null): string | null {
	if (!iso) return null
	const then = new Date(iso).getTime()
	if (Number.isNaN(then)) return null
	const diff = Date.now() - then
	const mins = Math.round(diff / 60000)
	if (mins < 1) return "just now"
	if (mins < 60) return `${mins}m ago`
	const hrs = Math.round(mins / 60)
	if (hrs < 24) return `${hrs}h ago`
	const days = Math.round(hrs / 24)
	if (days < 30) return `${days}d ago`
	const months = Math.round(days / 30)
	if (months < 12) return `${months}mo ago`
	return `${Math.round(months / 12)}y ago`
}

const cardClass = cn(
	"rounded-[14px] bg-[#14161A] p-5",
	"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
)

function PluginIcon({ src, alt }: { src: string | null; alt: string }) {
	const [failed, setFailed] = useState(false)
	if (!src || failed) {
		return (
			<div className="flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-[#1E293B] bg-[#080B0F]">
				<Plug className="size-4 text-[#737373]" />
			</div>
		)
	}
	return (
		<div className="flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-[#1E293B] bg-[#080B0F]">
			<Image
				alt={alt}
				className="size-5"
				height={20}
				onError={() => setFailed(true)}
				src={src}
				width={20}
			/>
		</div>
	)
}

export default function ConnectPage() {
	const [connections, setConnections] = useState<Connection[] | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [revoking, setRevoking] = useState<string | null>(null)

	const load = useCallback(async () => {
		try {
			const res = await fetch(`${API_URL}/v3/oauth/grants`, {
				credentials: "include",
			})
			if (!res.ok) throw new Error(`Failed to load connections (${res.status})`)
			const data = (await res.json()) as { grants: Connection[] }
			setConnections(data.grants)
			setError(null)
		} catch (err) {
			console.error("Failed to load connections:", err)
			setError(
				err instanceof Error ? err.message : "Failed to load connections",
			)
			setConnections([])
		}
	}, [])

	useEffect(() => {
		load()
	}, [load])

	async function revoke(clientId: string) {
		setRevoking(clientId)
		try {
			const res = await fetch(
				`${API_URL}/v3/oauth/grants/${encodeURIComponent(clientId)}`,
				{ method: "DELETE", credentials: "include" },
			)
			if (!res.ok && res.status !== 204)
				throw new Error(`Failed to revoke (${res.status})`)
			setConnections((prev) =>
				prev ? prev.filter((c) => c.clientId !== clientId) : prev,
			)
		} catch (err) {
			console.error("Failed to revoke connection:", err)
			setError(err instanceof Error ? err.message : "Failed to revoke")
		} finally {
			setRevoking(null)
		}
	}

	const connectedClientIds = new Set(connections?.map((c) => c.clientId) ?? [])

	return (
		<div
			className={cn(
				"mx-auto w-full max-w-[760px] px-4 py-10",
				dmSans125ClassName(),
			)}
		>
			<h1 className="font-semibold text-[22px] text-[#FAFAFA]">Connections</h1>
			<p className="mt-1 text-[14px] text-[#737373]">
				Apps and plugins you've connected to your Supermemory account.
			</p>

			<section className="mt-8">
				<h2 className="mb-3 text-[13px] text-[#737373] uppercase tracking-[0.06em]">
					Connected apps
				</h2>

				{connections === null ? (
					<div className={cn(cardClass, "flex items-center gap-3")}>
						<LoaderIcon className="size-4 animate-spin text-[#4BA0FA]" />
						<span className="text-[14px] text-[#737373]">Loading…</span>
					</div>
				) : connections.length === 0 ? (
					<div className={cn(cardClass, "text-center")}>
						<p className="text-[14px] text-[#FAFAFA]">No apps connected yet</p>
						<p className="mt-1 text-[13px] text-[#737373]">
							Connect a plugin below — anything you authorize will show up here.
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-2">
						{connections.map((c) => {
							const connectedRel = relativeTime(c.connectedAt)
							const usedRel = relativeTime(c.lastUsedAt)
							return (
								<div
									key={c.clientId}
									className={cn(cardClass, "flex items-center gap-4")}
								>
									<PluginIcon src={c.icon} alt={c.name} />
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<p className="truncate text-[15px] text-[#FAFAFA]">
												{c.name}
											</p>
											{!c.isFirstParty && (
												<span className="rounded-full border border-[#1E293B] px-1.5 py-0.5 text-[10px] text-[#737373] uppercase tracking-[0.04em]">
													external
												</span>
											)}
										</div>
										<div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#737373]">
											{c.workspaceName && (
												<span className="flex items-center gap-1">
													<Building2 className="size-3" />
													{c.workspaceName}
												</span>
											)}
											{connectedRel && <span>Connected {connectedRel}</span>}
											{usedRel && <span>Last used {usedRel}</span>}
										</div>
									</div>
									<button
										type="button"
										onClick={() => revoke(c.clientId)}
										disabled={revoking === c.clientId}
										className={cn(
											"flex items-center gap-1.5 rounded-[8px] border border-[#1E293B] bg-[#0D121A] px-3 py-1.5",
											"text-[13px] text-[#FAFAFA] transition-colors hover:bg-[#1E293B]",
											"cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
										)}
									>
										{revoking === c.clientId ? (
											<LoaderIcon className="size-3.5 animate-spin" />
										) : (
											<Trash2 className="size-3.5" />
										)}
										Revoke
									</button>
								</div>
							)
						})}
					</div>
				)}

				{error && <p className="mt-2 text-[13px] text-red-400">{error}</p>}
			</section>

			<section className="mt-10">
				<h2 className="mb-3 text-[13px] text-[#737373] uppercase tracking-[0.06em]">
					Available plugins
				</h2>
				<div className="grid gap-2 sm:grid-cols-2">
					{OAUTH_PLUGINS.map((p) => {
						const isConnected =
							p.oauthClientId != null && connectedClientIds.has(p.oauthClientId)
						return (
							<div
								key={p.id}
								className={cn(cardClass, "flex flex-col gap-3 p-4")}
							>
								<div className="flex items-center gap-3">
									<PluginIcon src={p.icon} alt={p.name} />
									<p className="flex-1 truncate text-[15px] text-[#FAFAFA]">
										{p.name}
									</p>
									{isConnected && (
										<span className="rounded-full border border-[#1f4d44] bg-[#0c1c19] px-2 py-0.5 text-[10px] text-[#7fd9c4] uppercase tracking-[0.04em]">
											Connected
										</span>
									)}
								</div>
								<p className="text-[13px] text-[#8B8B8B] leading-snug">
									{p.description}
								</p>
								<a
									href={p.docsUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex w-fit items-center gap-1.5 text-[13px] text-[#4BA0FA] transition-opacity hover:opacity-80"
								>
									Setup guide
									<ExternalLink className="size-3.5" />
								</a>
							</div>
						)
					})}
				</div>
			</section>
		</div>
	)
}
