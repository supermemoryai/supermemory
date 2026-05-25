"use client"

import { Brain } from "lucide-react"
import { motion } from "motion/react"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { useSpaceProfile } from "@/hooks/use-space-profile"
import { cn } from "@lib/utils"

type SpaceProfilePanelProps = {
	containerTag: string
	isOpen: boolean
}

type SpaceProfileContentProps = {
	containerTag: string
}

function CountBadge({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex h-[18px] min-w-[22px] items-center justify-center rounded-[4px] bg-[#1C2B3E] px-1.5 text-[10px] font-semibold text-[#A3A3A3]">
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
		<div className="flex min-h-[180px] flex-col items-center justify-center rounded-[14px] border border-[#161F2C] bg-[#0D121A] px-5 py-8 text-center">
			<div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#00173C]">
				<Brain className="size-4 text-[#4BA0FA]" />
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

export function SpaceProfileContent({
	containerTag,
}: SpaceProfileContentProps) {
	const { data, isLoading, error } = useSpaceProfile(containerTag)
	const keyFacts = data?.static ?? []
	const recentContext = data?.dynamic ?? []
	const totalCount = keyFacts.length + recentContext.length

	return (
		<div className={cn(dmSansClassName(), "flex min-h-0 flex-1 flex-col")}>
			<div className="border-b border-[#161F2C] pb-3">
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
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto pt-4 scrollbar-thin">
				{isLoading ? (
					<LoadingState />
				) : error ? (
					<p className="rounded-[12px] border border-red-500/20 bg-red-500/10 p-3 text-[13px] text-red-300">
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
	)
}

export function SpaceProfilePanel({
	containerTag,
	isOpen,
}: SpaceProfilePanelProps) {
	if (!isOpen) return null

	return (
		<motion.aside
			initial={{ opacity: 0, width: 0, x: 12 }}
			animate={{ opacity: 1, width: 300, x: 0 }}
			exit={{ opacity: 0, width: 0, x: 12 }}
			transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
			className={cn(
				"hidden h-full w-[300px] shrink-0 flex-col rounded-[14px] bg-[#14161A] p-4 md:flex",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
			)}
		>
			<SpaceProfileContent containerTag={containerTag} />
		</motion.aside>
	)
}
