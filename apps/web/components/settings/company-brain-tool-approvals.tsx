"use client"

import { cn } from "@lib/utils"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowLeft, Loader2, Lock, Search, X } from "lucide-react"
import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import {
	type ToolApprovalDecision,
	type ToolApprovalEntry,
	useToolApprovals,
	useUpdateToolApprovals,
} from "@/hooks/use-tool-approvals"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"
import { dmSans125ClassName } from "@/lib/fonts"
import { brainConnectorIcon } from "../brain-connector-icons"

const fieldLabel = cn(
	dmSans125ClassName(),
	"text-[11px] font-medium uppercase tracking-[0.06em] text-[#5B6675]",
)

function titleCase(value: string) {
	return value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function Segmented({
	value,
	options,
	disabled,
	onChange,
}: {
	value: string
	options: { id: string; label: string }[]
	disabled?: boolean
	onChange: (id: string) => void
}) {
	return (
		<div className="flex items-center gap-0.5 rounded-full bg-[#0D121A] p-0.5 shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.5)]">
			{options.map((option) => (
				<button
					key={option.id}
					type="button"
					aria-pressed={value === option.id}
					disabled={disabled}
					onClick={() => {
						if (value !== option.id) onChange(option.id)
					}}
					className={cn(
						dmSans125ClassName(),
						"h-7 cursor-pointer rounded-full px-3 text-[11.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
						value === option.id
							? "bg-white/[0.10] text-[#FAFAFA]"
							: "text-[#8B929E] hover:text-[#FAFAFA]",
					)}
				>
					{option.label}
				</button>
			))}
		</div>
	)
}

function ToolRow({
	tool,
	disabled,
	onChange,
}: {
	tool: ToolApprovalEntry
	disabled: boolean
	onChange: (decision: ToolApprovalDecision | null) => void
}) {
	const isRead = tool.toolClass === "read"
	return (
		<div className="flex min-h-[52px] items-center justify-between gap-3 border-white/[0.06] border-b px-4 py-2">
			<div className="min-w-0">
				<p
					className={cn(
						dmSans125ClassName(),
						"flex items-center gap-2 truncate text-[13px] font-medium text-[#FAFAFA]",
					)}
				>
					{tool.name}
					{tool.toolClass === "dangerous" ? (
						<span className="shrink-0 rounded-full bg-[#3A1D1D] px-2 py-0.5 text-[10px] font-medium text-[#FF9B9B]">
							Raw access
						</span>
					) : null}
				</p>
				{tool.description ? (
					<p
						className={cn(
							dmSans125ClassName(),
							"mt-0.5 line-clamp-1 text-[12px] text-[#737B87]",
						)}
					>
						{tool.description}
					</p>
				) : null}
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{isRead ? (
					<span
						className={cn(dmSans125ClassName(), "text-[12px] text-[#737373]")}
					>
						Reads never ask
					</span>
				) : (
					<Segmented
						value={tool.decision}
						disabled={disabled}
						options={[
							{ id: "ask", label: "Ask" },
							{ id: "allow", label: "Allow" },
						]}
						onChange={(id) => onChange(id as ToolApprovalDecision)}
					/>
				)}
			</div>
		</div>
	)
}

export default function CompanyBrainToolApprovals({
	serverSlug,
}: {
	serverSlug: string
}) {
	const isCompanyBrain = useHasCompanyBrain()
	const query = useToolApprovals(serverSlug, isCompanyBrain)
	const update = useUpdateToolApprovals(serverSlug)
	const [search, setSearch] = useState("")
	const scrollRef = useRef<HTMLDivElement>(null)

	const data = query.data
	const tools = useMemo(() => {
		const all = data?.tools ?? []
		const term = search.trim().toLowerCase()
		const matching = term
			? all.filter(
					(tool) =>
						tool.name.toLowerCase().includes(term) ||
						tool.description.toLowerCase().includes(term),
				)
			: all
		// Writes first: they are the only rows with a decision to make.
		return [...matching].sort((left, right) => {
			const rank = (tool: ToolApprovalEntry) =>
				tool.toolClass === "read" ? 1 : 0
			return rank(left) - rank(right) || left.name.localeCompare(right.name)
		})
	}, [data?.tools, search])

	const virtualizer = useVirtualizer({
		count: tools.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => 60,
		overscan: 8,
	})

	if (!isCompanyBrain) return null

	const readOnlyConnection = data?.accessScope === "organization"
	const disabled = readOnlyConnection || query.isLoading || update.isPending
	const writeCount = (data?.tools ?? []).filter(
		(tool) => tool.toolClass !== "read",
	).length
	const allowedCount = (data?.tools ?? []).filter(
		(tool) => tool.toolClass !== "read" && tool.decision === "allow",
	).length

	return (
		<section className="flex w-full max-w-3xl flex-col gap-4 px-1">
			<Link
				href="/configure"
				className={cn(
					dmSans125ClassName(),
					"flex w-fit items-center gap-1.5 text-[12px] text-[#8B929E] transition-colors hover:text-[#FAFAFA]",
				)}
			>
				<ArrowLeft className="size-3.5" />
				Integrations
			</Link>

			<div className="flex items-center gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#080B0F] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]">
					{brainConnectorIcon(serverSlug, serverSlug)}
				</div>
				<div className="min-w-0">
					<h3
						className={cn(
							dmSans125ClassName(),
							"truncate font-semibold text-[14px] tracking-[-0.15px] text-[#FAFAFA]",
						)}
					>
						{titleCase(serverSlug)}
					</h3>
					<p
						className={cn(
							dmSans125ClassName(),
							"mt-0.5 text-[12px] text-[#737B87]",
						)}
					>
						{data?.status === "ready"
							? `${data.tools.length} tools · ${writeCount} can make changes · ${allowedCount} always allowed`
							: "Loading tools…"}
					</p>
				</div>
			</div>

			{query.isError ? (
				<p className={cn(dmSans125ClassName(), "text-[13px] text-red-400")}>
					Couldn't load this app's tools.
				</p>
			) : data?.status === "not_connected" ? (
				<p className={cn(dmSans125ClassName(), "text-[13px] text-[#8B929E]")}>
					You aren't connected to this app. Connect it from Integrations to set
					tool permissions.
				</p>
			) : data?.status === "warming" || query.isLoading ? (
				<div className="flex items-center gap-2 text-[13px] text-[#9A9A9A]">
					<Loader2 className="size-4 animate-spin" />
					Fetching this app's tool list…
				</div>
			) : (
				<>
					<div className="flex flex-col gap-2">
						<span className={fieldLabel}>Actions that change things</span>
						<div className="flex items-center justify-between gap-3 rounded-xl bg-[#14161A] px-4 py-3 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
							<p
								className={cn(
									dmSans125ClassName(),
									"text-[13px] text-[#FAFAFA]",
								)}
							>
								Ask before running
								<span className="ml-2 text-[12px] text-[#737B87]">
									Applies to any tool without its own setting
								</span>
							</p>
							<Segmented
								value={data?.defaultWriteApproval ?? "ask"}
								disabled={disabled}
								options={[
									{ id: "ask", label: "Ask" },
									{ id: "allow", label: "Allow" },
								]}
								onChange={(id) =>
									update.mutate({
										defaultWriteApproval: id as "ask" | "allow",
									})
								}
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between gap-3">
							<span className={fieldLabel}>Tools</span>
							<div className="flex h-8 min-w-0 max-w-[240px] flex-1 items-center gap-1.5 rounded-full bg-[#0D121A] px-3 shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.5)]">
								<Search className="size-3.5 shrink-0 text-[#A1A1AA]" />
								<input
									type="text"
									value={search}
									onChange={(event) => setSearch(event.target.value)}
									placeholder="Search tools"
									className={cn(
										dmSans125ClassName(),
										"min-w-0 flex-1 bg-transparent text-[12px] text-[#FAFAFA] placeholder:text-[#525D6E] focus:outline-none",
									)}
								/>
								{search ? (
									<button
										type="button"
										aria-label="Clear search"
										onClick={() => setSearch("")}
										className="shrink-0 text-[#737373] transition-colors hover:text-[#FAFAFA]"
									>
										<X className="size-3.5" />
									</button>
								) : null}
							</div>
						</div>

						<div className="overflow-hidden rounded-xl bg-[#14161A] shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
							{tools.length === 0 ? (
								<p
									className={cn(
										dmSans125ClassName(),
										"px-4 py-6 text-center text-[13px] text-[#737373]",
									)}
								>
									No tools match "{search}".
								</p>
							) : (
								<div
									ref={scrollRef}
									className="max-h-[520px] overflow-y-auto"
									// A connected server can expose hundreds of tools.
								>
									<div
										style={{
											height: virtualizer.getTotalSize(),
											position: "relative",
										}}
									>
										{virtualizer.getVirtualItems().map((row) => {
											const tool = tools[row.index]
											if (!tool) return null
											return (
												<div
													key={tool.name}
													ref={virtualizer.measureElement}
													data-index={row.index}
													style={{
														position: "absolute",
														top: 0,
														left: 0,
														width: "100%",
														transform: `translateY(${row.start}px)`,
													}}
												>
													<ToolRow
														tool={tool}
														disabled={disabled}
														onChange={(decision) =>
															update.mutate({
																rules: { [tool.name]: decision },
															})
														}
													/>
												</div>
											)
										})}
									</div>
								</div>
							)}
						</div>
					</div>

					{readOnlyConnection ? (
						<div className="flex items-center gap-1.5 text-[12px] text-[#737373]">
							<Lock className="size-3.5" />
							This is the workspace connection, which can only read. Connect
							your own account to make changes.
						</div>
					) : null}
				</>
			)}
		</section>
	)
}
