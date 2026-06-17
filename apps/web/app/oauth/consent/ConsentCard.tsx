"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { ClaudeDesktopIcon, MCPIcon } from "@ui/assets/icons"
import { Logo, LogoFull } from "@ui/assets/Logo"
import { Popover, PopoverAnchor, PopoverContent } from "@ui/components/popover"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip"
import { ArrowLeft, BadgeCheck, Check, LoaderIcon, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import {
	type ComponentType,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react"

type IconComponent = ComponentType<{ className?: string }>

// Mirror of the OAuth plugins in mono's packages/lib/plugins.ts. An entry here
// makes a client "verified" — we show its bundled icon + real name. Unknown DCR
// clients still connect; they just render as a generic MCP client.
export const OAUTH_PLUGINS: Record<
	string,
	{ name: string; icon?: IconComponent }
> = {
	"supermemory-claude-code": { name: "Claude Code", icon: ClaudeDesktopIcon },
	"supermemory-opencode": { name: "OpenCode" },
	"supermemory-openclaw": { name: "OpenClaw" },
	"supermemory-codex": { name: "OpenAI Codex" },
}

const GRADIENT_BG =
	"linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%)"
const GRADIENT_SHADOW =
	"1px 1px 2px 0px #1A88FF inset, 0 2px 10px 0 rgba(5, 1, 0, 0.20)"

const EXPIRY_OPTIONS = [
	{ label: "1 year", value: "365" },
	{ label: "6 months", value: "180" },
	{ label: "90 days", value: "90" },
	{ label: "30 days", value: "30" },
	{ label: "7 days", value: "7" },
	{ label: "Never", value: "0" },
]

export function shortClientId(id: string): string {
	return id.length > 12 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id
}

export type ConsentOrg = {
	id: string
	name: string
}
export type ConsentPermission = "read" | "write"
export type ConsentScopeType = "full" | "scoped"
export type ConsentScope = {
	permission: ConsentPermission
	scopeType: ConsentScopeType
	tags: string[]
	expiresDays: number
}

function SectionLabel({ children }: { children: ReactNode }) {
	return (
		<span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#737373]">
			{children}
		</span>
	)
}

function ConnectingDots() {
	return (
		<div className="flex items-center gap-1">
			{["a", "b", "c"].map((k, i) => (
				<span
					className="size-1.5 animate-pulse rounded-full bg-[#525660]"
					key={k}
					style={{
						animationDelay: `${i * 220}ms`,
						animationDuration: "1100ms",
					}}
				/>
			))}
		</div>
	)
}

function ConnectingHeader({
	clientIcon: ClientIcon,
}: {
	clientIcon: IconComponent
}) {
	return (
		<div className="flex items-center justify-center gap-3">
			<div className="flex size-12 items-center justify-center rounded-[13px] bg-[#0B0D11] text-[#FAFAFA] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
				<Logo className="h-6 w-auto text-white" />
			</div>
			<ConnectingDots />
			<div className="flex size-12 items-center justify-center rounded-[13px] bg-[#0B0D11] text-[#FAFAFA] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
				<ClientIcon className="size-6" />
			</div>
		</div>
	)
}

function SpacesPicker({
	options,
	selected,
	setSelected,
	loading,
	disabled,
}: {
	options: string[]
	selected: string[]
	setSelected: (next: string[]) => void
	loading: boolean
	disabled?: boolean
}) {
	const [query, setQuery] = useState("")
	const [open, setOpen] = useState(false)
	const fieldRef = useRef<HTMLDivElement>(null)
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		return options
			.filter(
				(o) => !selected.includes(o) && (!q || o.toLowerCase().includes(q)),
			)
			.slice(0, 50)
	}, [options, selected, query])

	const add = (t: string) => {
		if (!selected.includes(t)) setSelected([...selected, t])
		setQuery("")
	}
	const remove = (t: string) => setSelected(selected.filter((x) => x !== t))

	return (
		<Popover onOpenChange={setOpen} open={open && !disabled}>
			<PopoverAnchor asChild>
				<div
					className="rounded-[12px] border border-white/[0.06] bg-[#0B0D11] p-2.5"
					ref={fieldRef}
				>
					{selected.length > 0 && (
						<div className="mb-2 flex flex-wrap gap-1.5">
							{selected.map((t) => (
								<span
									className="inline-flex items-center gap-1.5 rounded-[7px] bg-[#1B1E25] py-1 pr-1.5 pl-2.5 text-[12.5px] text-[#FAFAFA]"
									key={t}
								>
									{t}
									<button
										className="text-[#9AA0A6] transition-colors hover:text-[#FAFAFA]"
										disabled={disabled}
										onClick={() => remove(t)}
										type="button"
									>
										<X className="size-3" />
									</button>
								</span>
							))}
						</div>
					)}
					<input
						className="w-full bg-transparent px-1 py-1 text-[14px] text-[#FAFAFA] placeholder:text-[#5C5C5C] focus:outline-none"
						disabled={disabled}
						onChange={(e) => setQuery(e.target.value)}
						onFocus={() => setOpen(true)}
						placeholder={loading ? "Loading spaces…" : "Search spaces to add…"}
						value={query}
					/>
				</div>
			</PopoverAnchor>
			<PopoverContent
				align="start"
				className="max-h-[210px] w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-[10px] border-white/10 bg-[#14161A] p-1 shadow-[0px_8px_28px_rgba(0,0,0,0.5)] [scrollbar-width:thin]"
				onFocusOutside={(e) => {
					if (fieldRef.current?.contains(e.target as Node)) e.preventDefault()
				}}
				onInteractOutside={(e) => {
					if (fieldRef.current?.contains(e.target as Node)) e.preventDefault()
				}}
				onOpenAutoFocus={(e) => e.preventDefault()}
				sideOffset={6}
			>
				{filtered.length === 0 ? (
					<p className="px-2 py-2 text-[12.5px] text-[#737373]">
						{loading
							? "Loading spaces…"
							: query.trim()
								? `No spaces match “${query.trim()}”.`
								: "No spaces available."}
					</p>
				) : (
					filtered.map((t) => (
						<button
							className="flex w-full items-center rounded-[7px] px-2 py-1.5 text-left text-[13px] text-[#E8E8E8] transition-colors hover:bg-white/[0.05]"
							key={t}
							onClick={() => add(t)}
							onMouseDown={(e) => e.preventDefault()}
							type="button"
						>
							{t}
						</button>
					))
				)}
			</PopoverContent>
		</Popover>
	)
}

export function CardShell({ children }: { children: ReactNode }) {
	return (
		<div className="relative flex min-h-screen items-center justify-center bg-[#08090C] p-4">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						"radial-gradient(60% 50% at 50% 0%, rgba(75,160,250,0.06), transparent 70%)",
				}}
			/>
			<div
				className={cn(
					"relative flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[14px] bg-[#14161A] shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
					dmSans125ClassName(),
				)}
			>
				{children}
			</div>
		</div>
	)
}

export function FullScreenMessage({
	title,
	subtitle,
}: {
	title: string
	subtitle: string
}) {
	return (
		<CardShell>
			<div className="p-6 text-center">
				<LogoFull className="mx-auto h-5 w-auto text-[#FAFAFA]" />
				<h2 className="mt-5 text-[18px] font-semibold text-[#FAFAFA]">
					{title}
				</h2>
				<p className="mt-1.5 text-[13px] text-[#737373]">{subtitle}</p>
			</div>
		</CardShell>
	)
}

export interface ConsentCardProps {
	appLabel: string
	verified: boolean
	clientId: string
	userEmail?: string
	orgs: ConsentOrg[]
	availableTags: string[]
	tagsLoading: boolean
	submitting: "approve" | "deny" | null
	error: string | null
	onEnterOrg: (orgId: string) => Promise<void>
	onScopedOpen: () => void
	onSubmit: (accept: boolean, scope: ConsentScope) => void
	onSignOut: () => void
}

export function ConsentCard({
	appLabel,
	verified,
	clientId,
	userEmail,
	orgs,
	availableTags,
	tagsLoading,
	submitting,
	error,
	onEnterOrg,
	onScopedOpen,
	onSubmit,
	onSignOut,
}: ConsentCardProps) {
	const [step, setStep] = useState<1 | 2>(1)
	const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
	const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)
	const [autoTried, setAutoTried] = useState(false)
	const [permission, setPermission] = useState<ConsentPermission>("write")
	const [scopeType, setScopeType] = useState<ConsentScopeType>("full")
	const [tags, setTags] = useState<string[]>([])
	const [expiresDays, setExpiresDays] = useState("365")

	const multiOrg = orgs.length > 1
	const busy = submitting !== null || switchingOrgId !== null
	const selectedOrg = orgs.find((o) => o.id === selectedOrgId) ?? null
	const ClientIcon = (clientId && OAUTH_PLUGINS[clientId]?.icon) || MCPIcon
	const title = verified ? `Authorize ${appLabel}` : "Authorize MCP"
	const connectLabel = verified ? appLabel : "this MCP client"

	const enterOrg = useCallback(
		async (orgId: string) => {
			if (!orgId) return
			setSelectedOrgId(orgId)
			setSwitchingOrgId(orgId)
			try {
				await onEnterOrg(orgId)
			} catch {
				setSwitchingOrgId(null)
				return
			}
			setSwitchingOrgId(null)
			setTags([])
			setStep(2)
		},
		[onEnterOrg],
	)

	useEffect(() => {
		if (autoTried || step !== 1 || orgs.length !== 1) return
		setAutoTried(true)
		void enterOrg(orgs[0]?.id ?? "")
	}, [orgs, step, autoTried, enterOrg])

	useEffect(() => {
		if (step === 2 && scopeType === "scoped") onScopedOpen()
	}, [step, scopeType, onScopedOpen])

	const listRef = useRef<HTMLDivElement>(null)
	const [canScrollUp, setCanScrollUp] = useState(false)
	const [canScrollDown, setCanScrollDown] = useState(false)
	const measureFades = useCallback((el: HTMLDivElement | null) => {
		if (!el) return
		setCanScrollUp(el.scrollTop > 8)
		setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 8)
	}, [])
	useEffect(() => {
		if (step !== 1 || orgs.length === 0) {
			setCanScrollUp(false)
			setCanScrollDown(false)
			return
		}
		measureFades(listRef.current)
	}, [orgs, step, measureFades])

	const submit = (accept: boolean) =>
		onSubmit(accept, {
			permission,
			scopeType,
			tags,
			expiresDays: Number(expiresDays),
		})

	return (
		<div className="relative flex min-h-screen items-center justify-center bg-[#08090C] p-4">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						"radial-gradient(60% 50% at 50% 0%, rgba(75,160,250,0.05), transparent 70%)",
				}}
			/>
			<div
				className={cn(
					"relative flex w-full max-w-[440px] flex-col",
					dmSans125ClassName(),
				)}
			>
				<AnimatePresence mode="wait">
					{step === 1 ? (
						<motion.div
							animate={{ opacity: 1 }}
							className="flex flex-col"
							exit={{ opacity: 0 }}
							initial={{ opacity: 0 }}
							key="step1"
							transition={{ duration: 0.18 }}
						>
							<div className="pt-2 pb-6 text-center">
								<Logo className="mx-auto h-8 w-auto text-white" />
								<h1 className="mt-6 text-[20px] font-semibold tracking-[-0.2px] text-[#FAFAFA]">
									Select an organization
								</h1>
								<p className="mt-3 text-[13px] text-[#737373]">
									Choose which organization to connect {connectLabel} to.
								</p>
							</div>

							<div className="relative">
								<div
									className="flex max-h-[360px] flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
									onScroll={(e) => measureFades(e.currentTarget)}
									ref={listRef}
								>
									{orgs.length === 0 ? (
										<p className="py-6 text-center text-[13px] text-[#737373]">
											No organizations found on your account.
										</p>
									) : (
										orgs.map((o) => {
											const switching = switchingOrgId === o.id
											return (
												<button
													className={cn(
														"flex w-full items-center gap-3 rounded-[12px] bg-[#14161A] px-4 py-3.5 text-left transition-colors",
														"hover:bg-[#1B1E25]",
														"disabled:cursor-not-allowed disabled:opacity-60",
													)}
													disabled={busy}
													key={o.id}
													onClick={() => enterOrg(o.id)}
													type="button"
												>
													<div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.06] text-[14px] font-semibold text-[#FAFAFA]">
														{o.name?.charAt(0)?.toUpperCase() ?? "?"}
													</div>
													<span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#FAFAFA]">
														{o.name}
													</span>
													{switching && (
														<LoaderIcon className="size-4 shrink-0 animate-spin text-[#9AA0A6]" />
													)}
												</button>
											)
										})
									)}
								</div>
								<div
									aria-hidden
									className={cn(
										"pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#08090C] to-transparent transition-opacity duration-300",
										canScrollUp ? "opacity-100" : "opacity-0",
									)}
								/>
								<div
									aria-hidden
									className={cn(
										"pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#08090C] to-transparent transition-opacity duration-300",
										canScrollDown ? "opacity-100" : "opacity-0",
									)}
								/>
							</div>

							{error && (
								<p className="pt-3 text-center text-[13px] text-red-400">
									{error}
								</p>
							)}

							<div className="flex flex-col items-center gap-1 pt-6">
								{userEmail && (
									<p className="text-[12px] text-[#737373]">
										Signed in as {userEmail}
									</p>
								)}
								<button
									className="text-[12px] text-[#9AA0A6] transition-colors hover:text-[#FAFAFA]"
									onClick={onSignOut}
									type="button"
								>
									Sign out
								</button>
							</div>
						</motion.div>
					) : (
						<motion.div
							animate={{ opacity: 1 }}
							className="flex max-h-[92vh] min-h-0 flex-col overflow-hidden rounded-[14px] bg-[#14161A] shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]"
							exit={{ opacity: 0 }}
							initial={{ opacity: 0 }}
							key="step2"
							transition={{ duration: 0.18 }}
						>
							<div className="px-6 pt-7 pb-5 text-center">
								<ConnectingHeader clientIcon={ClientIcon} />
								<div className="mt-5 flex items-center justify-center gap-1.5">
									<h1 className="text-[19px] font-semibold tracking-[-0.2px] text-[#FAFAFA]">
										{title}
									</h1>
									{verified && (
										<TooltipProvider delayDuration={150}>
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="cursor-default text-[#FAFAFA]">
														<BadgeCheck className="size-[18px]" />
													</span>
												</TooltipTrigger>
												<TooltipContent>Verified app</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									)}
								</div>
								<p className="mt-1 text-[13px] text-[#737373]">
									{verified ? appLabel : "An MCP client"} wants to connect to
									your supermemory.
								</p>
							</div>

							<div className="min-h-0 overflow-y-auto">
								<div className="mx-6 h-px bg-white/[0.06]" />
								<div className="flex items-center justify-between gap-3 px-6 py-3.5">
									<div className="min-w-0">
										<SectionLabel>Connecting to</SectionLabel>
										<p className="truncate text-[14px] font-medium text-[#FAFAFA]">
											{selectedOrg?.name ?? "Workspace"}
										</p>
									</div>
									{multiOrg && (
										<button
											className="flex shrink-0 items-center gap-1 rounded-[7px] px-2 py-1.5 text-[12px] text-[#9AA0A6] transition-colors hover:bg-white/[0.04] hover:text-[#FAFAFA] disabled:opacity-50"
											disabled={busy}
											onClick={() => setStep(1)}
											type="button"
										>
											<ArrowLeft className="size-3.5" />
											Change
										</button>
									)}
								</div>
								<div className="mx-6 h-px bg-white/[0.06]" />

								<div className="flex flex-col gap-4 px-6 py-5">
									<div className="flex flex-col gap-2">
										<SectionLabel>Permission</SectionLabel>
										<Choice
											disabled={busy}
											onChange={setPermission}
											options={[
												{ value: "write", label: "Read + Write" },
												{ value: "read", label: "Read only" },
											]}
											value={permission}
										/>
									</div>

									<div className="flex flex-col gap-2">
										<SectionLabel>Access</SectionLabel>
										<Choice
											disabled={busy}
											onChange={setScopeType}
											options={[
												{ value: "full", label: "Full access" },
												{ value: "scoped", label: "Scoped" },
											]}
											value={scopeType}
										/>
										<AnimatePresence initial={false}>
											{scopeType === "scoped" && (
												<motion.div
													animate={{ opacity: 1, height: "auto" }}
													className="overflow-hidden"
													exit={{ opacity: 0, height: 0 }}
													initial={{ opacity: 0, height: 0 }}
													transition={{ duration: 0.2 }}
												>
													<div className="mt-1.5">
														<SpacesPicker
															disabled={busy}
															loading={tagsLoading}
															options={availableTags}
															selected={tags}
															setSelected={setTags}
														/>
														<p className="mt-2 text-[12px] text-[#5C6470]">
															{tags.length > 0
																? `${tags.length} space${tags.length === 1 ? "" : "s"} selected`
																: "Type to search and add spaces."}
														</p>
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>

									<div className="flex flex-col gap-2">
										<SectionLabel>Expires</SectionLabel>
										<Select
											disabled={busy}
											onValueChange={setExpiresDays}
											value={expiresDays}
										>
											<SelectTrigger className="h-10 w-full rounded-[10px] border-white/[0.08] bg-[#0B0D11] text-[14px] text-[#FAFAFA]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{EXPIRY_OPTIONS.map((o) => (
													<SelectItem key={o.value} value={o.value}>
														{o.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{error && <p className="text-[13px] text-red-400">{error}</p>}
								</div>
							</div>

							<div className="mx-6 h-px bg-white/[0.06]" />
							<div className="flex items-center justify-between gap-3 px-6 py-4">
								<button
									className="rounded-[10px] px-3 py-2.5 text-[13px] font-medium text-[#9AA0A6] transition-colors hover:text-[#FAFAFA] disabled:opacity-50"
									disabled={busy}
									onClick={() => submit(false)}
									type="button"
								>
									{submitting === "deny" ? "Cancelling…" : "Cancel"}
								</button>
								<button
									className={cn(
										"relative flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-[10px] px-6",
										"text-[14px] font-medium tracking-[-0.14px] text-[#FAFAFA]",
										"cursor-pointer transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
									)}
									disabled={
										busy || (scopeType === "scoped" && tags.length === 0)
									}
									onClick={() => submit(true)}
									style={{
										background: GRADIENT_BG,
										boxShadow: GRADIENT_SHADOW,
									}}
									type="button"
								>
									{submitting === "approve" ? (
										<LoaderIcon className="size-4 animate-spin" />
									) : (
										<>
											<Check className="size-4" />
											Approve
										</>
									)}
									<div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
								</button>
							</div>

							{clientId && !verified && (
								<p className="px-6 pb-4 text-center text-[11px] text-[#5C5C5C]">
									App ID · <code>{shortClientId(clientId)}</code>
								</p>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	)
}

function Choice<T extends string>({
	options,
	value,
	onChange,
	disabled,
}: {
	options: { value: T; label: string }[]
	value: T
	onChange: (v: T) => void
	disabled?: boolean
}) {
	return (
		<div className={cn("grid grid-cols-2 gap-2", dmSans125ClassName())}>
			{options.map((o) => {
				const active = o.value === value
				return (
					<button
						className={cn(
							"h-10 rounded-[10px] border px-3 text-[13px] font-medium transition-colors",
							"disabled:cursor-not-allowed disabled:opacity-60",
							active
								? "border-white/15 bg-white/[0.07] text-[#FAFAFA]"
								: "cursor-pointer border-white/[0.07] bg-transparent text-[#9AA0A6] hover:border-white/15 hover:text-[#FAFAFA]",
						)}
						disabled={disabled}
						key={o.value}
						onClick={() => onChange(o.value)}
						type="button"
					>
						{o.label}
					</button>
				)
			})}
		</div>
	)
}
