"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { Button } from "@ui/components/button"
import { Input } from "@ui/components/input"
import { Textarea } from "@ui/components/textarea"
import {
	ArrowRight,
	Brain,
	Building2,
	LayoutGrid,
	Loader2,
	Plug,
	Terminal,
	User2,
	UserPlus,
	Users2,
} from "lucide-react"
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import type { BrainMode } from "./types"

export interface AboutValues {
	name: string
	about: string
	workspaceName: string
	workspaceDomain: string
}

interface Props {
	mode: BrainMode
	onModeChange: (m: BrainMode) => void
	domain: string | null
	suggestedWorkspaceName: string
	defaultName: string
	avatarUrl: string | null
	values: AboutValues
	onChange: (next: AboutValues) => void
	onContinue: () => void
	submitting?: boolean
}

const cardSurfaceStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

const inputBevelStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

const fieldLabel = "pl-2 pb-2 font-semibold text-[14px] text-[#737373]"
const inputClass =
	"bg-[#0F1217] border border-[rgba(82,89,102,0.2)] rounded-[12px] text-[#fafafa] text-[14px] placeholder:text-[#525D6E] h-12 px-4 shadow-none focus-visible:ring-0 focus-visible:border-[rgba(115,115,115,0.3)] transition-colors"

export function StepAbout({
	mode,
	onModeChange,
	domain,
	suggestedWorkspaceName,
	defaultName,
	avatarUrl,
	values,
	onChange,
	onContinue,
	submitting,
}: Props) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: one-time initialization when defaults become available
	useEffect(() => {
		const patch: Partial<AboutValues> = {}
		if (!values.name && defaultName) patch.name = defaultName
		if (!values.workspaceName && suggestedWorkspaceName) {
			patch.workspaceName = suggestedWorkspaceName
		}
		if (!values.workspaceDomain && domain) {
			patch.workspaceDomain = domain
		}
		if (Object.keys(patch).length > 0) onChange({ ...values, ...patch })
	}, [defaultName, suggestedWorkspaceName, domain])

	const canContinue =
		values.name.trim().length > 0 && values.workspaceName.trim().length > 0

	return (
		<div className="space-y-5">
			<div className="grid md:grid-cols-[1.6fr_1fr] gap-4 items-stretch">
				<section
					className="rounded-[22px] bg-[#1B1F24] p-6 md:p-7"
					style={cardSurfaceStyle}
				>
					<UserAvatar
						url={avatarUrl}
						name={values.name || defaultName}
						className="size-14 mb-5"
					/>
					<p
						className={cn(
							"font-semibold text-[#fafafa] text-[20px]",
							dmSans125ClassName(),
						)}
					>
						Tell us about you
					</p>
					<p className="text-[#737373] font-medium text-[15px] leading-[1.4] mt-1.5">
						So your brain sounds like yours, not the docs.
					</p>

					<div className="mt-6 space-y-5">
						<div>
							<p className={fieldLabel}>Your name</p>
							<Input
								value={values.name}
								onChange={(e) => onChange({ ...values, name: e.target.value })}
								placeholder="e.g. Mahesh"
								className={inputClass}
								style={inputBevelStyle}
							/>
						</div>

						<div>
							<p className={fieldLabel}>
								What are you here for?{" "}
								<span className="text-[#525D6E] font-medium">(optional)</span>
							</p>
							<Textarea
								value={values.about}
								onChange={(e) => onChange({ ...values, about: e.target.value })}
								placeholder="A sentence or two — what you do, what you're hoping the brain helps with."
								rows={4}
								className={cn(
									inputClass,
									"h-auto resize-none py-3 leading-[1.5]",
								)}
								style={inputBevelStyle}
							/>
						</div>
					</div>
				</section>

				<section
					className="rounded-[22px] bg-[#1B1F24] p-6 md:p-7 flex flex-col"
					style={cardSurfaceStyle}
				>
					<ModeToggle mode={mode} onChange={onModeChange} />

					<div className="mt-6">
						{mode === "team" ? (
							<TeamWorkspaceCard
								domain={values.workspaceDomain || domain || ""}
								onDomainChange={(d) =>
									onChange({ ...values, workspaceDomain: d })
								}
								value={values.workspaceName}
								onChange={(w) => onChange({ ...values, workspaceName: w })}
								suggested={suggestedWorkspaceName}
							/>
						) : (
							<PersonalWorkspaceCard
								value={values.workspaceName}
								onChange={(w) => onChange({ ...values, workspaceName: w })}
							/>
						)}
					</div>
				</section>
			</div>

			<div className="flex items-center justify-end gap-[22px] px-1">
				<Button
					variant="insideOut"
					onClick={onContinue}
					disabled={!canContinue || submitting}
					className="rounded-full px-5 py-[10px] text-[13px] font-medium text-[#fafafa]"
				>
					{submitting ? (
						<>
							Creating…
							<Loader2 className="size-3.5 animate-spin" />
						</>
					) : (
						<>
							Continue
							<ArrowRight className="size-3.5" />
						</>
					)}
				</Button>
			</div>
		</div>
	)
}

function TeamWorkspaceCard({
	domain,
	onDomainChange,
	value,
	onChange,
	suggested,
}: {
	domain: string
	onDomainChange: (d: string) => void
	value: string
	onChange: (v: string) => void
	suggested: string
}) {
	return (
		<>
			<div className="flex items-center gap-3">
				<div
					className="size-12 rounded-[12px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex items-center justify-center overflow-hidden shrink-0"
					style={inputBevelStyle}
				>
					{domain ? (
						<DomainLogo domain={domain} />
					) : (
						<Building2 className="size-5 text-[#737373]" />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<input
						value={domain}
						onChange={(e) => onDomainChange(e.target.value.trim())}
						placeholder="your-team.com"
						className="w-full bg-transparent text-[18px] text-[#fafafa] font-semibold leading-tight outline-none border-b border-transparent hover:border-[rgba(115,115,115,0.2)] focus:border-[rgba(115,115,115,0.4)] transition-colors px-0 py-0.5"
					/>
					<div className="text-[12px] text-[#737373] font-medium mt-0.5">
						Team workspace
					</div>
				</div>
			</div>

			<div className="mt-6">
				<p className={fieldLabel}>
					Workspace name{" "}
					<span className="text-[#525D6E] font-medium">
						(rename if you'd like)
					</span>
				</p>
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={suggested || "Acme"}
					className={inputClass}
					style={inputBevelStyle}
				/>
			</div>

			<PerksList
				heading="What this unlocks"
				perks={[
					{
						icon: <UserPlus className="size-4 text-[#8B8B8B]" />,
						title: "Invite teammates",
						blurb: "Everyone contributes to the same brain.",
					},
					{
						icon: <Terminal className="size-4 text-[#8B8B8B]" />,
						title: "Shared coding agent context",
						blurb: "Claude, Cursor, MCP — same brain across the team.",
					},
					{
						icon: <LayoutGrid className="size-4 text-[#8B8B8B]" />,
						title: "Org-wide spaces",
						blurb: "Carve out sales, eng, design with their own access.",
					},
				]}
			/>

			<p className="text-[12px] text-[#525D6E] mt-auto pt-5 leading-[1.5] font-medium">
				Not your team? Switch above.
			</p>
		</>
	)
}

function DomainLogo({ domain }: { domain: string }) {
	const sources = [
		`https://logo.clearbit.com/${domain}`,
		`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64`,
		`https://icons.duckduckgo.com/ip3/${domain}.ico`,
	]
	const [idx, setIdx] = useState(0)
	if (idx >= sources.length) {
		return <Building2 className="size-5 text-[#737373]" />
	}
	return (
		<img
			src={sources[idx]}
			alt={domain}
			className="size-6 object-contain"
			onError={() => setIdx((i) => i + 1)}
		/>
	)
}

function PersonalWorkspaceCard({
	value,
	onChange,
}: {
	value: string
	onChange: (v: string) => void
}) {
	return (
		<>
			<div className="flex items-center gap-3">
				<div
					className="size-12 rounded-[12px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex items-center justify-center"
					style={inputBevelStyle}
				>
					<User2 className="size-5 text-[#737373]" />
				</div>
				<div>
					<div className="text-[18px] text-[#fafafa] font-semibold">
						Just you, for now
					</div>
					<div className="text-[12px] text-[#737373] font-medium mt-0.5">
						Personal workspace
					</div>
				</div>
			</div>

			<div className="mt-6">
				<p className={fieldLabel}>Workspace nickname</p>
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder="My brain"
					className={inputClass}
					style={inputBevelStyle}
				/>
			</div>

			<PerksList
				heading="What this unlocks"
				perks={[
					{
						icon: <Brain className="size-4 text-[#8B8B8B]" />,
						title: "Your own brain",
						blurb: "Notes, docs, bookmarks — all searchable in one place.",
					},
					{
						icon: <Plug className="size-4 text-[#8B8B8B]" />,
						title: "Plug into your AI tools",
						blurb: "Claude, Cursor, ChatGPT — your context, everywhere.",
					},
					{
						icon: <Users2 className="size-4 text-[#8B8B8B]" />,
						title: "Switch to a team anytime",
						blurb: "Invite teammates whenever you're ready.",
					},
				]}
			/>

			<p className="text-[12px] text-[#525D6E] mt-auto pt-5 leading-[1.5] font-medium">
				Working with a team? Switch above.
			</p>
		</>
	)
}

function ModeToggle({
	mode,
	onChange,
}: {
	mode: BrainMode
	onChange: (m: BrainMode) => void
}) {
	const items: { id: BrainMode; label: string }[] = [
		{ id: "personal", label: "Personal" },
		{ id: "team", label: "Team" },
	]
	return (
		<div
			className="relative grid grid-cols-2 items-center rounded-full bg-[#0D121A] border border-[rgba(115,115,115,0.2)] p-1 text-[13px] font-medium w-full"
			style={{
				boxShadow: "inset 1.313px 1.313px 3.938px 0px rgba(0,0,0,0.7)",
			}}
		>
			{items.map((item) => {
				const isActive = mode === item.id
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => onChange(item.id)}
						className={cn(
							"relative h-8 rounded-full text-center transition-colors",
							isActive
								? "text-[#fafafa]"
								: "text-[#737373] hover:text-[#fafafa]",
						)}
					>
						{isActive && (
							<motion.span
								layoutId="brain-mode-pill"
								className="absolute inset-0 rounded-full"
								style={{
									background: "#00173C",
									border: "1px solid #2261CA66",
								}}
								transition={{
									type: "spring",
									stiffness: 380,
									damping: 34,
								}}
							/>
						)}
						<span className="relative z-10">{item.label}</span>
					</button>
				)
			})}
		</div>
	)
}

function UserAvatar({
	url,
	name,
	className,
}: {
	url: string | null
	name: string
	className?: string
}) {
	const [errored, setErrored] = useState(false)
	const initial = (name?.trim()?.[0] ?? "?").toUpperCase()
	const hasImage = url && !errored

	return (
		<div
			className={cn(
				"rounded-full overflow-hidden bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex items-center justify-center",
				className,
			)}
			style={inputBevelStyle}
		>
			{hasImage ? (
				<img
					src={url}
					alt={name}
					className="size-full object-cover"
					onError={() => setErrored(true)}
				/>
			) : (
				<span className="text-[20px] font-semibold text-[#fafafa]">
					{initial}
				</span>
			)}
		</div>
	)
}

type Perk = { icon: React.ReactNode; title: string; blurb: string }

function PerksList({ heading, perks }: { heading: string; perks: Perk[] }) {
	return (
		<div className="mt-6">
			<p className="text-[10px] uppercase tracking-[0.08em] text-[#737373] font-semibold mb-3 pl-1">
				{heading}
			</p>
			<ul className="space-y-2.5">
				{perks.map((p) => (
					<li key={p.title} className="flex items-center gap-2.5 pl-1">
						<span className="shrink-0">{p.icon}</span>
						<span className="text-[13px] text-[#fafafa] font-medium">
							{p.title}
						</span>
					</li>
				))}
			</ul>
		</div>
	)
}
