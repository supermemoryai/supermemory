"use client"

import { $fetch } from "@lib/api"
import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Check, FileText, Loader2 } from "lucide-react"
import Link from "next/link"
import { dmSans125ClassName } from "@/lib/fonts"
import { ConnectionsBoard } from "./connections-board"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

const cardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

type RecentDoc = {
	id?: string
	title?: string | null
	createdAt?: string | Date | null
}

function useBrainOverview() {
	const { user, org } = useAuth()
	const enabled = !!user && !!org?.id

	const docs = useQuery({
		queryKey: ["brain-recents", org?.id],
		queryFn: async () => {
			const res = await $fetch("@post/documents/documents", {
				body: {
					page: 1,
					limit: 6,
					sort: "createdAt",
					order: "desc",
					containerTags: [],
				},
				disableValidation: true,
			})
			if (res.error) throw new Error(res.error?.message)
			return res.data as unknown as {
				documents?: RecentDoc[]
				pagination?: { totalItems?: number }
			}
		},
		staleTime: 60_000,
		enabled,
	})

	const connectors = useQuery({
		queryKey: ["brain-home", "connectors"],
		queryFn: async () => {
			const res = await $fetch("@post/connections/list", {
				body: { containerTags: [] },
			})
			if (res.error) return [] as Array<{ provider?: string }>
			return (res.data ?? []) as Array<{ provider?: string }>
		},
		staleTime: 30_000,
		enabled,
	})

	const brain = useQuery({
		queryKey: ["brain-connections"],
		queryFn: async () => {
			const [c, s] = await Promise.all([
				fetch(`${BACKEND}/brain/connections`, { credentials: "include" }),
				fetch(`${BACKEND}/brain/slack/status`, { credentials: "include" }),
			])
			const toolkits = c.ok
				? ((await c.json()) as { toolkits: { org: boolean; user: boolean }[] })
						.toolkits
				: []
			const slack = s.ok
				? ((await s.json()) as { connected: boolean }).connected
				: false
			return {
				activeCount: toolkits.filter((t) => t.org || t.user).length,
				slack,
			}
		},
		staleTime: 30_000,
		enabled,
	})

	const mcp = useQuery({
		queryKey: ["mcp-status"],
		queryFn: async () => {
			const res = await $fetch("@get/mcp/has-login")
			if (res.error) return false
			return Boolean((res.data as { previousLogin?: boolean })?.previousLogin)
		},
		staleTime: 60_000,
		enabled,
	})

	const memoriesCount = docs.data?.pagination?.totalItems ?? 0
	const connectedCount =
		(brain.data?.activeCount ?? 0) +
		(brain.data?.slack ? 1 : 0) +
		(connectors.data?.length ?? 0)

	return {
		loading: docs.isPending,
		recentDocs: docs.data?.documents ?? [],
		memoriesCount,
		connectedCount,
		hasSource: connectedCount > 0,
		hasAgent: mcp.data ?? false,
		hasMemory: memoriesCount > 0,
	}
}

export function BrainHomeView() {
	const o = useBrainOverview()
	const stepsDone = [o.hasSource, o.hasAgent, o.hasMemory].filter(
		Boolean,
	).length

	return (
		<div className="mx-auto max-w-[1080px] space-y-6">
			<StatsRow
				memories={o.memoriesCount}
				connected={o.connectedCount}
				setupDone={stepsDone}
			/>
			<ConnectionsBoard />
			<div className="grid gap-4 lg:grid-cols-2">
				<RecentMemories docs={o.recentDocs} loading={o.loading} />
				<GettingStarted
					hasSource={o.hasSource}
					hasAgent={o.hasAgent}
					hasMemory={o.hasMemory}
				/>
			</div>
		</div>
	)
}

function StatsRow({
	memories,
	connected,
	setupDone,
}: {
	memories: number
	connected: number
	setupDone: number
}) {
	const tiles = [
		{ label: "Memories", value: memories.toLocaleString() },
		{ label: "Connected sources", value: String(connected) },
		{ label: "Setup", value: `${setupDone}/3` },
	]
	return (
		<section
			className="grid grid-cols-3 divide-x divide-white/[0.04] rounded-[16px] bg-[#1B1F24]"
			style={cardStyle}
		>
			{tiles.map((t) => (
				<div key={t.label} className="px-5 py-4">
					<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#737373]">
						{t.label}
					</p>
					<p
						className={cn(
							"mt-1.5 text-[22px] font-semibold leading-none tabular-nums text-[#fafafa]",
							dmSans125ClassName(),
						)}
					>
						{t.value}
					</p>
				</div>
			))}
		</section>
	)
}

function RecentMemories({
	docs,
	loading,
}: {
	docs: RecentDoc[]
	loading: boolean
}) {
	return (
		<section
			className="min-w-0 rounded-[18px] bg-[#1B1F24] p-5"
			style={cardStyle}
		>
			<p
				className={cn(
					"mb-3 text-[15px] font-semibold text-[#fafafa]",
					dmSans125ClassName(),
				)}
			>
				Recent memories
			</p>

			{loading ? (
				<div className="flex items-center gap-2 py-6 text-[13px] font-medium text-[#737373]">
					<Loader2 className="size-4 animate-spin" />
					Loading…
				</div>
			) : docs.length === 0 ? (
				<div className="flex items-center gap-3 rounded-[12px] bg-[#14161A] px-4 py-5">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0F1217] text-[#525D6E]">
						<FileText className="size-4" />
					</div>
					<div className="min-w-0">
						<p className="text-[13px] font-medium text-[#fafafa]">
							No memories yet
						</p>
						<p className="mt-0.5 text-[12px] font-medium leading-[1.5] text-[#737373]">
							Connect a source or ask your brain below — what you save shows up
							here.
						</p>
					</div>
				</div>
			) : (
				<ul className="divide-y divide-white/[0.04]">
					{docs.map((doc, i) => (
						<li
							key={doc.id ?? i}
							className="flex items-center gap-3 px-1 py-2.5"
						>
							<div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#0F1217] text-[#737373]">
								<FileText className="size-3.5" />
							</div>
							<p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#fafafa]">
								{doc.title?.trim() || "Untitled memory"}
							</p>
							<span className="shrink-0 text-[11px] font-medium text-[#737373]">
								{formatWhen(doc.createdAt)}
							</span>
						</li>
					))}
				</ul>
			)}
		</section>
	)
}

function GettingStarted({
	hasSource,
	hasAgent,
	hasMemory,
}: {
	hasSource: boolean
	hasAgent: boolean
	hasMemory: boolean
}) {
	const steps = [
		{
			done: hasSource,
			title: "Connect a source",
			hint: "GitHub, Linear, Drive or Slack.",
			href: "/settings/integrations",
		},
		{
			done: hasAgent,
			title: "Install a coding agent",
			hint: "Claude Code, Codex or Cursor.",
			href: "/settings/integrations",
		},
		{
			done: hasMemory,
			title: "Add your first memory",
			hint: "Save a doc, or ask your brain below.",
		},
	]
	return (
		<section
			className="relative h-fit overflow-hidden rounded-[18px] bg-[#1B1F24] p-5"
			style={cardStyle}
		>
			<div
				aria-hidden
				className="absolute -top-px right-8 left-8 h-px"
				style={{
					background:
						"linear-gradient(to right, transparent, rgba(75,160,250,0.45), transparent)",
				}}
			/>
			<p
				className={cn(
					"text-[15px] font-semibold text-[#fafafa]",
					dmSans125ClassName(),
				)}
			>
				Getting started
			</p>
			<p className="mt-0.5 text-[12px] font-medium text-[#737373]">
				A few steps to make your brain useful.
			</p>

			<ul className="mt-4 space-y-2.5">
				{steps.map((step) => (
					<li key={step.title} className="flex items-start gap-3">
						<span
							aria-hidden
							className={cn(
								"mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border",
								step.done
									? "border-[#4BA0FA] bg-[#4BA0FA]"
									: "border-[rgba(82,89,102,0.4)]",
							)}
						>
							{step.done && <Check className="size-3 text-white" />}
						</span>
						<div className="min-w-0 flex-1">
							<div className="flex items-center justify-between gap-2">
								<p
									className={cn(
										"text-[13px] font-medium",
										step.done
											? "text-[#737373] line-through"
											: "text-[#fafafa]",
									)}
								>
									{step.title}
								</p>
								{!step.done && step.href && (
									<Link
										href={step.href}
										className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-[#4BA0FA] transition-opacity hover:opacity-80"
									>
										Set up
										<ArrowRight className="size-3" />
									</Link>
								)}
							</div>
							{!step.done && (
								<p className="mt-0.5 text-[12px] font-medium leading-[1.4] text-[#737373]">
									{step.hint}
								</p>
							)}
						</div>
					</li>
				))}
			</ul>
		</section>
	)
}

function formatWhen(value?: string | Date | null): string {
	if (!value) return ""
	const d = new Date(value)
	if (Number.isNaN(d.getTime())) return ""
	const min = Math.round((Date.now() - d.getTime()) / 60000)
	if (min < 1) return "just now"
	if (min < 60) return `${min}m`
	const hr = Math.round(min / 60)
	if (hr < 24) return `${hr}h`
	const day = Math.round(hr / 24)
	if (day < 7) return `${day}d`
	return d.toLocaleDateString()
}
