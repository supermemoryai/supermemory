"use client"

import { Brain, Loader, X } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { useSpaceProfile } from "@/hooks/use-space-profile"
import {
	useSpaceContext,
	useUpdateSpaceContext,
} from "@/hooks/use-space-context"
import { cn } from "@lib/utils"

type SpaceProfilePanelProps = {
	containerTag: string
	isOpen: boolean
	onClose: () => void
}

type SpaceProfileContentProps = {
	containerTag: string
	onClose?: () => void
}

function CountBadge({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex h-[18px] min-w-[22px] items-center justify-center rounded-[4px] bg-white/[0.05] px-1.5 text-[10px] font-semibold text-[#A3A3A3]">
			{children}
		</span>
	)
}

function LoadingState() {
	return (
		<div className="flex flex-col gap-3 pt-1">
			{Array.from({ length: 5 }).map((_, index) => (
				<div
					key={index}
					className="h-10 w-full animate-pulse rounded-[10px] bg-white/[0.04]"
				/>
			))}
		</div>
	)
}

function EmptyState() {
	return (
		<div className="flex min-h-[180px] flex-col items-center justify-center rounded-[14px] border border-white/[0.08] bg-[#14161A] px-5 py-8 text-center">
			<div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#0D121A] shadow-inside-out">
				<Brain className="size-4 text-[#A3A3A3]" />
			</div>
			<p className="text-[14px] font-medium text-[#FAFAFA]">No profile yet</p>
			<p className="mt-1 text-[12px] leading-relaxed text-[#737373]">
				Add more memories and Nova will learn about this space.
			</p>
		</div>
	)
}

function ProfileSection({ label, items }: { label: string; items: string[] }) {
	if (items.length === 0) return null

	return (
		<div className="flex flex-col gap-2.5">
			<div className="flex items-center gap-2">
				<span
					className={cn(
						dmSans125ClassName(),
						"text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737373]",
					)}
				>
					{label}
				</span>
				<CountBadge>{items.length}</CountBadge>
			</div>
			<div className="flex flex-col gap-1">
				{items.map((item, index) => (
					<div
						key={`${label}-${index}-${item}`}
						className="rounded-[10px] px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
					>
						<div className="flex items-start gap-2">
							<Brain className="mt-1 size-3 shrink-0 text-[#A3A3A3]" />
							<p className="line-clamp-3 text-[12px] leading-relaxed text-[#D4D4D4]">
								{item}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

function SpaceContextEditor({ containerTag }: { containerTag: string }) {
	const { data, isLoading } = useSpaceContext(containerTag)
	const update = useUpdateSpaceContext()
	const [value, setValue] = useState("")
	const saved = data?.entityContext ?? ""

	useEffect(() => {
		setValue(data?.entityContext ?? "")
	}, [data?.entityContext])

	const dirty = value.trim() !== saved.trim()

	const handleSave = () => {
		update.mutate({
			containerTag,
			entityContext: value.trim() ? value.trim() : null,
		})
	}

	return (
		<div className="flex flex-col gap-2 rounded-[14px] border border-white/[0.08] bg-[#14161A] p-3">
			<div className="flex flex-col gap-0.5">
				<span
					className={cn(
						dmSans125ClassName(),
						"text-[12px] font-semibold text-[#FAFAFA]",
					)}
				>
					What to remember
				</span>
				<span className="text-[11px] leading-relaxed text-[#737373]">
					Tell Nova what matters in this space — it shapes which memories get
					extracted.
				</span>
			</div>
			<textarea
				value={value}
				onChange={(event) => setValue(event.target.value)}
				disabled={isLoading || update.isPending}
				placeholder="e.g. This space tracks Acme's billing project — decisions, owners, and deadlines."
				maxLength={750}
				className="min-h-[80px] w-full resize-y rounded-[10px] border border-white/[0.08] bg-[#0D121A] px-3 py-2.5 text-[12px] leading-relaxed text-[#FAFAFA] placeholder:text-[#525966] focus:border-white/[0.16] focus:outline-none disabled:opacity-60"
			/>
			<div className="flex items-center justify-between">
				<span className="text-[11px] text-[#737373] tabular-nums">
					{value.length}/750
				</span>
				{dirty && (
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setValue(saved)}
							disabled={update.isPending}
							className={cn(
								dmSansClassName(),
								"h-7 rounded-full px-3 text-[12px] font-medium text-[#737373] transition-colors hover:text-[#A3A3A3] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
							)}
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSave}
							disabled={update.isPending}
							className={cn(
								dmSansClassName(),
								"inline-flex h-7 items-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] font-semibold text-[#FAFAFA] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
							)}
						>
							{update.isPending && <Loader className="size-3 animate-spin" />}
							Save
						</button>
					</div>
				)}
			</div>
		</div>
	)
}

export function SpaceProfileContent({
	containerTag,
	onClose,
}: SpaceProfileContentProps) {
	const { data, isLoading, error } = useSpaceProfile(containerTag)
	const keyFacts = data?.static ?? []
	const recentContext = data?.dynamic ?? []
	const totalCount = keyFacts.length + recentContext.length

	return (
		<div className={cn(dmSansClassName(), "flex min-h-0 flex-1 flex-col")}>
			<div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
				<div>
					<h3
						className={cn(
							dmSans125ClassName(),
							"text-[15px] font-semibold tracking-[-0.15px] text-[#FAFAFA]",
						)}
					>
						Space Profile
					</h3>
					<p className="mt-0.5 text-[12px] text-[#737373]">
						What Nova knows in this space
					</p>
				</div>
				{onClose ? (
					<button
						type="button"
						aria-label="Close space profile"
						onClick={onClose}
						className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0D121A] text-[#737373] shadow-inside-out transition-opacity hover:opacity-80 cursor-pointer"
					>
						<X className="size-4" />
					</button>
				) : null}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto pt-4 scrollbar-thin">
				<SpaceContextEditor containerTag={containerTag} />
				<div className="mt-5">
					{isLoading ? (
						<LoadingState />
					) : error ? (
						<p className="rounded-[12px] border border-white/[0.08] bg-[#14161A] p-3 text-[13px] text-[#A3A3A3]">
							Failed to load space profile.
						</p>
					) : totalCount === 0 ? (
						<EmptyState />
					) : (
						<div className="flex flex-col gap-5">
							<ProfileSection label="Key Facts" items={keyFacts} />
							<ProfileSection label="Recent Context" items={recentContext} />
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export function SpaceProfilePanel({
	containerTag,
	isOpen,
	onClose,
}: SpaceProfilePanelProps) {
	if (!isOpen) return null

	return (
		<motion.aside
			initial={{ opacity: 0, width: 0, x: 12 }}
			animate={{ opacity: 1, width: 300, x: 0 }}
			exit={{ opacity: 0, width: 0, x: 12 }}
			transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
			className={cn(
				"hidden h-full w-[300px] shrink-0 flex-col rounded-[18px] border border-white/[0.08] bg-[#1B1F24] p-4 md:flex",
				"shadow-[0_2.842px_14.211px_rgba(0,0,0,0.25),inset_0.711px_0.711px_0.711px_rgba(255,255,255,0.10)]",
			)}
		>
			<SpaceProfileContent containerTag={containerTag} onClose={onClose} />
		</motion.aside>
	)
}
