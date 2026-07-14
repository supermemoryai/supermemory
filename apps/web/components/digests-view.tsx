"use client"

import { useEffect, useState } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName, dmSans125ClassName } from "@/lib/fonts"
import {
	Loader2,
	Mail,
	ThumbsUp,
	ThumbsDown,
	MoreHorizontal,
} from "lucide-react"
import { toast } from "sonner"
import { SyncLogoIcon } from "@ui/assets/icons"
import { analytics } from "@/lib/analytics"
import { useDigests, useDigest, type DigestSummary } from "@/hooks/use-digests"

interface DigestsViewProps {
	initialDigestId?: string | null
}

// feature → illustration (served from /images/digest/)
const FEATURE_IMG: Record<string, string> = {
	connections: "feat-router.png",
	chat: "feat-memory.png",
	extension: "feat-retrieval.png",
	plugins: "feat-profiles.png",
	mcp: "feat-router.png",
	search: "feat-retrieval.png",
}
const BRAIN_IMG = "https://supermemory.ai/images/brain-head.png"

function formatIsoWeek(isoWeek: string): string {
	const match = isoWeek.match(/^(\d{4})-W(\d{2})$/)
	if (!match) return isoWeek
	const year = Number.parseInt(match[1] as string, 10)
	const week = Number.parseInt(match[2] as string, 10)
	const jan4 = new Date(year, 0, 4)
	const dow = jan4.getDay() || 7
	const start = new Date(jan4)
	start.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7)
	const end = new Date(start)
	end.setDate(start.getDate() + 6)
	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	]
	const sm = months[start.getMonth()] ?? ""
	const em = months[end.getMonth()] ?? ""
	return `${sm} ${start.getDate()}–${sm === em ? "" : `${em} `}${end.getDate()}, ${year}`
}

function isoWeekLabel(isoWeek: string): string {
	const m = isoWeek.match(/-W(\d{2})$/)
	return m ? `W${Number.parseInt(m[1] as string, 10)}` : isoWeek
}

// ─── Left list row ────────────────────────────────────────────────────────────
function DigestRow({
	digest,
	featured,
	selected,
	onSelect,
}: {
	digest: DigestSummary
	featured: boolean
	selected: boolean
	onSelect: () => void
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"group flex w-full flex-col gap-3 rounded-[12px] bg-[#14161A] p-4 text-left shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] transition-colors hover:bg-[#16181D] focus:outline-none",
				selected && "bg-[#1C2026]",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<span
					className={cn(
						dmSansClassName(),
						"flex h-9 shrink-0 items-center justify-center rounded-[10px] bg-[#080B0F] px-2.5 text-[13px] font-semibold text-[#8BC6FF] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]",
					)}
				>
					{isoWeekLabel(digest.isoWeek)}
				</span>
				{featured && (
					<span className="shrink-0 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#737373]">
						Latest
					</span>
				)}
			</div>
			<div>
				<p
					className={cn(
						dmSans125ClassName(),
						"line-clamp-2 text-[14px] font-medium leading-snug text-[#FAFAFA]",
					)}
				>
					{digest.title || "Your week in Supermemory"}
				</p>
				<div className="mt-2 flex items-center justify-between gap-2">
					<span
						className={cn(
							dmSansClassName(),
							"flex items-center gap-1.5 text-[11px]",
						)}
					>
						<span
							className="flex items-center gap-1 font-semibold"
							style={{
								background:
									"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
								backgroundClip: "text",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
							}}
						>
							<SyncLogoIcon className="h-[10px] w-[12.33px]" />
							{digest.memoryCount}
						</span>
						<span className="text-[#737373]">
							{digest.memoryCount === 1 ? "memory" : "memories"}
						</span>
					</span>
					<span className={cn(dmSansClassName(), "text-[11px] text-[#737373]")}>
						{formatIsoWeek(digest.isoWeek)}
					</span>
				</div>
			</div>
		</button>
	)
}

// ─── Right pane: a single digest, faithful to the email layout ─────────────────
function DigestContent({
	digestId,
	isoWeek,
}: {
	digestId: string
	isoWeek: string
}) {
	const { data: digest, isLoading } = useDigest(digestId)
	const [rating, setRating] = useState<"up" | "down" | null>(null)
	const [showInput, setShowInput] = useState(false)
	const [message, setMessage] = useState("")

	// reset feedback state when switching digests
	useEffect(() => {
		setRating(null)
		setShowInput(false)
		setMessage("")
		analytics.digestViewed({ digest_id: digestId, iso_week: isoWeek })
	}, [digestId, isoWeek])

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Loader2 className="size-6 animate-spin text-[#4BA0FA]" />
			</div>
		)
	}
	if (!digest) {
		return (
			<div className="flex h-64 items-center justify-center text-sm text-[#A1A1AA]">
				Digest not found.
			</div>
		)
	}

	const { digestData } = digest

	const rate = (r: "up" | "down") => {
		setRating(r)
		analytics.digestFeedback({
			digest_id: digestId,
			iso_week: isoWeek,
			rating: r,
		})
	}
	const submitDetail = () => {
		if (!message.trim()) return
		analytics.digestFeedbackDetail({
			digest_id: digestId,
			iso_week: isoWeek,
			rating,
			message: message.trim(),
		})
		setMessage("")
		setShowInput(false)
		toast.success("Thanks for the feedback!")
	}

	return (
		<div className={cn("mx-auto w-full max-w-[560px]", dmSansClassName())}>
			{/* Header */}
			<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8BC6FF]">
				Weekly digest · {formatIsoWeek(digest.isoWeek)}
			</p>
			<h1
				className={cn(
					dmSans125ClassName(),
					"mt-2 text-[30px] font-semibold leading-[1.12] tracking-tight text-[#FAFAFA]",
				)}
			>
				{digestData.title || "Your week in Supermemory"}
			</h1>

			{/* Greeting + intro, brain floated right */}
			<div className="mt-7">
				<img
					src={BRAIN_IMG}
					alt=""
					width={60}
					height={90}
					className="float-right ml-5 mb-2 h-[90px] w-auto"
				/>
				<p className="text-[15px] leading-relaxed text-[#C2C9D6]">
					{digestData.intro}
				</p>
				<div className="clear-both" />
			</div>

			<div className="my-7 border-t border-white/[0.07]" />

			{/* Highlights — numbered, no boxes */}
			{digestData.highlights.length > 0 && (
				<>
					<p className="mb-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B7585]">
						This week's highlights
					</p>
					<div className="flex flex-col gap-6">
						{digestData.highlights.map((h, i) => (
							<div key={h.id} className="flex gap-3.5">
								<span className="w-7 shrink-0 pt-0.5 text-[12px] font-bold tracking-wider text-[#4BA0FA]">
									{String(i + 1).padStart(2, "0")}
								</span>
								<div className="min-w-0">
									<p className="mb-1 text-[16px] font-semibold leading-snug text-[#FAFAFA]">
										{h.title}
									</p>
									<p className="text-[14px] leading-relaxed text-[#A1A1AA]">
										{h.content}
									</p>
								</div>
							</div>
						))}
					</div>
				</>
			)}

			{/* Worth trying — the one place we use boxes (subtle) */}
			{digestData.featureRecommendations.length > 0 && (
				<div className="mt-8 rounded-2xl border border-[#4BA0FA]/15 bg-[#4BA0FA]/[0.06] p-5 sm:p-6">
					<p className="mb-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8BC6FF]">
						Worth trying
					</p>
					<div className="flex flex-col gap-5">
						{digestData.featureRecommendations.map((r) => (
							<a
								key={r.feature}
								href={r.ctaUrl}
								className="group flex items-start gap-3.5"
							>
								<img
									src={`/images/digest/${FEATURE_IMG[r.feature] ?? "feat-memory.png"}`}
									alt=""
									width={44}
									height={44}
									className="size-11 shrink-0"
								/>
								<div className="min-w-0">
									<p className="text-[14px] font-semibold leading-snug text-[#FAFAFA]">
										{r.headline}
									</p>
									<p className="mt-0.5 text-[13px] leading-snug text-[#A1A1AA]">
										{r.body}{" "}
										<span className="whitespace-nowrap font-semibold text-[#4BA0FA] group-hover:underline">
											{r.ctaLabel} →
										</span>
									</p>
								</div>
							</a>
						))}
					</div>
				</div>
			)}

			{/* Feedback */}
			<div className="mt-8 border-t border-white/[0.07] pt-5">
				<div className="flex items-center gap-3">
					<span className="text-[13px] text-[#A1A1AA]">
						Was this digest useful?
					</span>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							aria-label="Useful"
							onClick={() => rate("up")}
							className={cn(
								"flex size-8 items-center justify-center rounded-lg border transition-colors",
								rating === "up"
									? "border-[#4BA0FA]/50 bg-[#4BA0FA]/15 text-[#4BA0FA]"
									: "border-white/[0.08] bg-white/[0.02] text-[#A1A1AA] hover:bg-white/[0.05]",
							)}
						>
							<ThumbsUp className="size-4" />
						</button>
						<button
							type="button"
							aria-label="Not useful"
							onClick={() => rate("down")}
							className={cn(
								"flex size-8 items-center justify-center rounded-lg border transition-colors",
								rating === "down"
									? "border-[#4BA0FA]/50 bg-[#4BA0FA]/15 text-[#4BA0FA]"
									: "border-white/[0.08] bg-white/[0.02] text-[#A1A1AA] hover:bg-white/[0.05]",
							)}
						>
							<ThumbsDown className="size-4" />
						</button>
						<button
							type="button"
							aria-label="Leave detailed feedback"
							onClick={() => setShowInput((v) => !v)}
							className={cn(
								"flex size-8 items-center justify-center rounded-lg border transition-colors",
								showInput
									? "border-[#4BA0FA]/50 bg-[#4BA0FA]/15 text-[#4BA0FA]"
									: "border-white/[0.08] bg-white/[0.02] text-[#A1A1AA] hover:bg-white/[0.05]",
							)}
						>
							<MoreHorizontal className="size-4" />
						</button>
					</div>
				</div>

				{showInput && (
					<div className="mt-3">
						<textarea
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Tell us what you'd like to see in your digest…"
							rows={3}
							className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-[13px] text-[#FAFAFA] placeholder:text-[#6B7585] focus:border-[#4BA0FA]/50 focus:outline-none"
						/>
						<div className="mt-2 flex justify-end">
							<button
								type="button"
								onClick={submitDetail}
								disabled={!message.trim()}
								className="rounded-lg bg-[#4BA0FA] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
							>
								Send feedback
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

// ─── Master-detail ─────────────────────────────────────────────────────────────
export function DigestsView({ initialDigestId }: DigestsViewProps) {
	const { data: digests, isLoading } = useDigests()
	const [selectedId, setSelectedId] = useState<string | null>(
		initialDigestId ?? null,
	)

	// default to the most recent digest
	const effectiveId = selectedId ?? digests?.[0]?.id ?? null
	const selected = digests?.find((d) => d.id === effectiveId) ?? digests?.[0]

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader2 className="size-6 animate-spin text-[#4BA0FA]" />
			</div>
		)
	}

	if (!digests || digests.length === 0) {
		return (
			<div
				className={cn(
					"mx-auto flex max-w-md flex-col items-center justify-center gap-3 px-4 py-24 text-center",
					dmSansClassName(),
				)}
			>
				<div className="flex size-12 items-center justify-center rounded-[12px] bg-[#4BA0FA]/12">
					<Mail className="size-5 text-[#4BA0FA]" />
				</div>
				<p className="text-sm font-medium text-[#FAFAFA]">No digests yet</p>
				<p className="max-w-xs text-[12px] leading-relaxed text-[#A1A1AA]">
					Your first weekly digest arrives Monday. It'll show your highlights
					and suggestions right here.
				</p>
			</div>
		)
	}

	return (
		<div
			className={cn(
				"mx-auto w-full max-w-[1600px] px-4 pb-6 pt-4 sm:px-6 lg:h-full lg:overflow-hidden",
				dmSansClassName(),
			)}
		>
			<div className="flex flex-col gap-6 lg:h-full lg:flex-row lg:gap-8">
				{/* Left: digest list (scrolls independently) */}
				<aside className="shrink-0 lg:min-h-0 lg:w-1/3 lg:min-w-[210px] lg:overflow-y-auto lg:pr-1">
					<div className="mb-4 flex items-baseline justify-between gap-3">
						<h1
							className={cn(
								dmSans125ClassName(),
								"text-xl font-semibold tracking-tight text-[#FAFAFA]",
							)}
						>
							Weekly Digests
						</h1>
						<p className="shrink-0 text-[12px] text-[#737373]">
							{digests.length} {digests.length === 1 ? "digest" : "digests"} ·
							new every Monday
						</p>
					</div>
					<div className="flex flex-col gap-2">
						{digests.map((d, i) => (
							<DigestRow
								key={d.id}
								digest={d}
								featured={i === 0}
								selected={d.id === effectiveId}
								onSelect={() => setSelectedId(d.id)}
							/>
						))}
					</div>
				</aside>

				{/* Right: selected digest in a document-viewer surface (not a modal) */}
				<main className="min-w-0 flex-1 lg:min-h-0 lg:overflow-hidden">
					<div
						className="flex h-full min-h-0 flex-col rounded-[22px] "
						style={{
							boxShadow:
								"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
						}}
					>
						<div
							className="min-h-0 flex-1 overflow-y-auto rounded-[14px] bg-[#14161A] px-5 py-8 sm:px-8 sm:py-10"
							style={{
								boxShadow:
									"inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(0, 0, 0, 0.1)",
							}}
						>
							{selected && (
								<DigestContent
									digestId={selected.id}
									isoWeek={selected.isoWeek}
								/>
							)}
						</div>
					</div>
				</main>
			</div>
		</div>
	)
}
