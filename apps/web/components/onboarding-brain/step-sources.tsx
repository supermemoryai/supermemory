"use client"

import { useState } from "react"
import { Button } from "@ui/components/button"
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@ui/components/drawer"
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons"
import { Logo } from "@ui/assets/Logo"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import {
	AlertTriangle,
	ArrowRight,
	Check,
	Database,
	FolderOpen,
	Github,
	Globe,
	Mic,
	Plus,
} from "lucide-react"
import {
	AppleShortcutsIcon,
	ChromeIcon,
	RaycastIcon,
} from "@/components/integration-icons"

function XBookmarksIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24H16.17l-4.71-6.23-5.4 6.23H2.74l7.73-8.84L1.25 2.25H8.08l4.25 5.62 5.91-5.62Zm-1.16 17.52h1.83L7.08 4.13H5.12z" />
		</svg>
	)
}

function GmailIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 256 193"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<path
				d="M58.182 192.05V93.14L27.507 65.077 0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455z"
				fill="#4285F4"
			/>
			<path
				d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837-27.026 25.798z"
				fill="#34A853"
			/>
			<path
				d="m58.182 93.14-4.174-38.647 4.174-36.989L128 69.868l69.818-52.364 4.668 33.95-4.668 41.685L128 145.504z"
				fill="#EA4335"
			/>
			<path
				d="M197.818 17.504V93.14L256 49.504V26.231c0-21.585-24.64-33.89-41.89-20.945z"
				fill="#FBBC04"
			/>
			<path
				d="m0 49.504 26.759 20.07L58.182 93.14V17.504L41.89 5.286C24.61-7.66 0 4.646 0 26.23z"
				fill="#C5221F"
			/>
		</svg>
	)
}
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { $fetch } from "@lib/api"
import { toast } from "sonner"

type SourceId = "drive" | "notion" | "gmail" | "github" | "onedrive"
type SourceState = "idle" | "connecting" | "connected" | "waitlist"
type DriveScope = "selective" | "full"

export interface SourcesValues {
	connected: Partial<Record<SourceId, SourceState>>
	driveScope: DriveScope
}

interface Props {
	containerTag: string
	workspaceName: string
	values: SourcesValues
	onChange: (next: SourcesValues) => void
	onContinue: () => void
}

const modalCardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

const inputBevelStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

export function StepSources({
	containerTag,
	workspaceName,
	values,
	onChange,
	onContinue,
}: Props) {
	const [moreOpen, setMoreOpen] = useState(false)

	const setState = (id: SourceId, state: SourceState) => {
		onChange({ ...values, connected: { ...values.connected, [id]: state } })
	}

	const connectRealProvider = async (
		provider: "google-drive" | "notion" | "onedrive",
		id: SourceId,
	) => {
		setState(id, "connecting")
		try {
			const metadata: Record<string, string> = {}
			if (provider === "google-drive") {
				metadata.scope = values.driveScope
			}
			const res = await $fetch("@post/connections/:provider", {
				params: { provider },
				body: {
					redirectUrl: window.location.href,
					containerTags: [containerTag],
					metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
				},
			})
			const data = "data" in res ? res.data : null
			if (data && "authLink" in data && data.authLink) {
				window.location.href = data.authLink
				return
			}
			throw new Error("No auth link returned")
		} catch (err) {
			setState(id, "idle")
			toast.error(
				err instanceof Error ? err.message : "Could not start connection",
			)
		}
	}

	const connectedCount = Object.values(values.connected).filter(
		(s) => s === "connected" || s === "waitlist",
	).length

	return (
		<div>
			<div className="flex flex-wrap items-end justify-between gap-3 mb-6 px-1">
				<div>
					<p
						className={cn(
							"font-semibold text-[#fafafa] text-[22px]",
							dmSans125ClassName(),
						)}
					>
						Connect your team's signals
					</p>
					<p className="text-[#737373] font-medium text-[15px] leading-[1.4] mt-1.5">
						Start with the sources that carry the most context. Add more
						anytime.
					</p>
				</div>
				<RoutingChip workspaceName={workspaceName} />
			</div>

			<div className="grid md:grid-cols-2 gap-3">
				<SourceCard
					title="Google Drive"
					blurb="Docs, sheets, slides — the working memory of your team."
					icon={<GoogleDrive className="size-7" />}
					state={values.connected.drive ?? "idle"}
					ctaLabel="Connect"
					perks={[
						"Docs, sheets, slides — all parsed",
						"Stays in sync as files change",
						"You pick what to share at sign-in",
					]}
					onConnect={() => connectRealProvider("google-drive", "drive")}
					headerNote={
						values.driveScope === "full" ? (
							<p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#FF8A47] font-medium">
								<AlertTriangle className="size-3 shrink-0" />
								Full Drive can exhaust your monthly usage.
							</p>
						) : null
					}
					footerLeft={
						<DriveScopePicker
							value={values.driveScope}
							onChange={(s) => onChange({ ...values, driveScope: s })}
						/>
					}
					footerRight={<SpaceChip name="My Drive" />}
				/>
				<SourceCard
					title="Notion"
					blurb="Pages, databases, the team's running wiki."
					icon={<Notion className="size-7" />}
					state={values.connected.notion ?? "idle"}
					ctaLabel="Connect"
					perks={[
						"Pages and database rows",
						"Stays in sync when you edit",
						"Pick which workspaces ingest",
					]}
					onConnect={() => connectRealProvider("notion", "notion")}
					footerRight={<SpaceChip name="Company Notion" />}
				/>
			</div>

			<div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-1">
				<button
					type="button"
					onClick={() => setMoreOpen(true)}
					className="text-[#737373] font-medium text-[14px] hover:text-[#fafafa] inline-flex items-center gap-1.5 transition-colors"
				>
					<Plus className="size-3.5" />
					More integrations
					<span className="text-[#525D6E]">
						(Gmail, GitHub, OneDrive, Granola…)
					</span>
				</button>
				<div className="flex items-center gap-[22px]">
					<button
						type="button"
						onClick={onContinue}
						className="text-[#737373] font-medium text-[14px] hover:text-[#999] transition-colors"
					>
						Skip for now
					</button>
					<Button
						variant="insideOut"
						onClick={onContinue}
						disabled={connectedCount === 0}
						className="rounded-full px-5 py-[10px] text-[13px] font-medium text-[#fafafa]"
					>
						Continue
						{connectedCount > 0 && (
							<span className="text-[#4BA0FA] ml-1">({connectedCount})</span>
						)}
						<ArrowRight className="size-3.5" />
					</Button>
				</div>
			</div>

			<MoreDrawer
				open={moreOpen}
				onClose={() => setMoreOpen(false)}
				containerTag={containerTag}
				connectRealProvider={connectRealProvider}
			/>
		</div>
	)
}

function RoutingChip({ workspaceName }: { workspaceName: string }) {
	return (
		<div
			className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-[#0D121A] border border-[rgba(115,115,115,0.2)] text-[12px]"
			style={{
				boxShadow: "inset 1.313px 1.313px 3.938px 0px rgba(0,0,0,0.7)",
			}}
			title="All sources route to your brain. You can carve out spaces after setup."
		>
			<Logo className="size-3.5 text-[#8B8B8B]" />
			<span className="text-[#737373] font-medium">Routing to</span>
			<span className="text-[#fafafa] font-semibold">
				{workspaceName || "your brain"}
			</span>
		</div>
	)
}

function SourceCard({
	title,
	blurb,
	icon,
	state,
	ctaLabel,
	perks,
	soft,
	headerNote,
	footerLeft,
	footerRight,
	onConnect,
}: {
	title: string
	blurb: string
	icon: React.ReactNode
	state: SourceState
	ctaLabel: string
	perks: string[]
	soft?: boolean
	headerNote?: React.ReactNode
	footerLeft?: React.ReactNode
	footerRight?: React.ReactNode
	onConnect: () => void
}) {
	const isDone = state === "connected" || state === "waitlist"

	return (
		<div
			className={cn(
				"rounded-[16px] p-5 transition-colors bg-[#1B1F24] flex flex-col",
				isDone && "ring-1 ring-[#2261CA33]",
			)}
			style={modalCardStyle}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-3 min-w-0">
					<div
						className="size-12 rounded-[12px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex items-center justify-center shrink-0"
						style={inputBevelStyle}
					>
						{icon}
					</div>
					<div className="min-w-0">
						<p className="text-[15px] font-semibold text-[#fafafa]">{title}</p>
						<p className="text-[12px] text-[#737373] mt-0.5 leading-[1.4] font-medium">
							{blurb}
						</p>
						{headerNote}
					</div>
				</div>
				{isDone ? (
					<span className="inline-flex items-center gap-1 text-[11px] text-[#4BA0FA] font-semibold uppercase tracking-[0.08em] shrink-0 mt-1">
						<Check className="size-3" />
						{state === "waitlist" ? "Requested" : "Connected"}
					</span>
				) : (
					<Button
						variant="insideOut"
						onClick={onConnect}
						disabled={state === "connecting"}
						className="shrink-0 rounded-full h-9 px-4 text-[13px] font-medium text-[#fafafa]"
					>
						{state === "connecting" ? "Opening…" : ctaLabel}
					</Button>
				)}
			</div>

			<ul className="mt-4 space-y-1.5">
				{perks.map((p) => (
					<li
						key={p}
						className="flex items-start gap-2.5 text-[12px] text-[#737373] font-medium leading-[1.5]"
					>
						<span
							aria-hidden
							className="size-1 rounded-full bg-[#525D6E] shrink-0 mt-[7px]"
						/>
						<span>{p}</span>
					</li>
				))}
			</ul>

			{soft && !isDone && (
				<p className="text-[11px] text-[#525D6E] mt-3 leading-[1.5] font-medium">
					OAuth lands shortly — request access and we'll auto-enable it.
				</p>
			)}

			{(footerLeft || footerRight) && (
				<div className="mt-auto pt-4 flex items-end justify-between gap-3">
					<div>{footerLeft}</div>
					<div className="pb-1.5">{footerRight}</div>
				</div>
			)}
		</div>
	)
}

function SpaceChip({ name }: { name: string }) {
	return (
		<div
			className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#737373]"
			title={`This source will save into the "${name}" space.`}
		>
			<span className="text-[10px] uppercase tracking-[0.08em] text-[#525D6E]">
				Saves to
			</span>
			<FolderOpen className="size-3 text-[#737373]" />
			<span className="text-[#fafafa]">{name}</span>
		</div>
	)
}

function DriveScopePicker({
	value,
	onChange,
}: {
	value: DriveScope
	onChange: (s: DriveScope) => void
}) {
	return (
		<Select value={value} onValueChange={(v) => onChange(v as DriveScope)}>
			<SelectTrigger className="h-7 px-3 rounded-full bg-transparent border border-[rgba(115,115,115,0.18)] text-[#737373] text-[11px] font-medium gap-1 w-auto shadow-none focus:ring-0 hover:text-[#fafafa] hover:border-[rgba(115,115,115,0.3)] transition-colors [&>svg]:size-3 [&>svg]:opacity-80">
				<SelectValue />
			</SelectTrigger>
			<SelectContent className="bg-[#14161A] border-[rgba(82,89,102,0.2)] rounded-[12px] min-w-[180px]">
				<SelectItem
					value="selective"
					className="text-[#fafafa] focus:bg-[#1B1F24] text-[13px]"
				>
					Files & folders
				</SelectItem>
				<SelectItem
					value="full"
					className="text-[#fafafa] focus:bg-[#1B1F24] text-[13px]"
				>
					Full Drive
				</SelectItem>
			</SelectContent>
		</Select>
	)
}

function MoreDrawer({
	open,
	onClose,
	containerTag,
	connectRealProvider,
}: {
	open: boolean
	onClose: () => void
	containerTag: string
	connectRealProvider: (
		provider: "google-drive" | "notion" | "onedrive",
		id: SourceId,
	) => void
}) {
	return (
		<Drawer open={open} onOpenChange={(o) => !o && onClose()}>
			<DrawerContent
				className="bg-[#1B1F24] border-none"
				style={modalCardStyle}
			>
				<DrawerHeader className="px-8 pt-6 pb-4 max-w-5xl mx-auto w-full">
					<DrawerTitle className="text-[#fafafa] text-[20px] font-semibold">
						More integrations
					</DrawerTitle>
					<p className="text-[#737373] text-[13px] font-medium mt-1">
						Add any of these alongside your spotlight sources. Everything routes
						to <span className="text-[#fafafa]">{containerTag}</span>.
					</p>
				</DrawerHeader>
				<div className="px-8 pb-8 max-w-5xl mx-auto w-full grid sm:grid-cols-2 gap-2.5">
					<MoreItem
						title="Gmail"
						blurb="Inbox threads, decisions, customer conversations."
						icon={<GmailIcon className="size-6" />}
						action="Request access"
						soft
					/>
					<MoreItem
						title="GitHub"
						blurb="PRs, issues, READMEs — every code decision searchable."
						icon={<Github className="size-6 text-[#fafafa]" />}
						action="Request access"
						soft
					/>
					<MoreItem
						title="OneDrive"
						blurb="Office docs from OneDrive."
						icon={<OneDrive className="size-6" />}
						action="Connect"
						onAction={() => connectRealProvider("onedrive", "onedrive")}
					/>
					<MoreItem
						title="Granola"
						blurb="Meeting notes into searchable decisions."
						icon={<Mic className="size-6 text-[#FF8A47]" />}
						action="Coming soon"
						soft
					/>
					<MoreItem
						title="Web crawler"
						blurb="Crawl any site into your brain."
						icon={<Globe className="size-6 text-[#8B8B8B]" />}
						action="Connect"
						soft
					/>
					<MoreItem
						title="S3"
						blurb="Files from an S3 bucket."
						icon={<Database className="size-6 text-[#8B8B8B]" />}
						action="Connect"
						soft
					/>
					<MoreItem
						title="Chrome extension"
						blurb="Save pages and clip from the browser."
						icon={<ChromeIcon className="size-7" />}
						action="Install"
						soft
					/>
					<MoreItem
						title="Apple Shortcuts"
						blurb="One-tap capture from iPhone."
						icon={<AppleShortcutsIcon />}
						action="Install"
						soft
					/>
					<MoreItem
						title="Raycast"
						blurb="Quick add from your Mac."
						icon={<RaycastIcon className="size-7" />}
						action="Install"
						soft
					/>
					<MoreItem
						title="X bookmarks"
						blurb="One-shot import of saved tweets."
						icon={<XBookmarksIcon className="size-5 text-[#fafafa]" />}
						action="Import"
						soft
					/>
				</div>
			</DrawerContent>
		</Drawer>
	)
}

function MoreItem({
	title,
	blurb,
	icon,
	action,
	soft,
	onAction,
}: {
	title: string
	blurb: string
	icon: React.ReactNode
	action: string
	soft?: boolean
	onAction?: () => void
}) {
	return (
		<div
			className="flex items-center gap-3 rounded-[14px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] px-4 py-3"
			style={inputBevelStyle}
		>
			<div
				className="size-10 rounded-[10px] bg-[#0F1217] border border-[rgba(82,89,102,0.2)] flex items-center justify-center shrink-0"
				style={inputBevelStyle}
			>
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[14px] text-[#fafafa] font-semibold truncate">
					{title}
				</p>
				<p className="text-[12px] text-[#737373] font-medium truncate">
					{blurb}
				</p>
			</div>
			<Button
				variant="insideOut"
				onClick={onAction}
				disabled={soft && !onAction}
				className={cn(
					"shrink-0 rounded-full h-8 px-3 text-[12px] font-medium text-[#fafafa]",
					soft && !onAction && "opacity-50",
				)}
			>
				{action}
			</Button>
		</div>
	)
}
