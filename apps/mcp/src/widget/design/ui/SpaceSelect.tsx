import { type ReactNode, useEffect, useMemo, useState } from "react"
import { ChevronDown, Plus, Search } from "../../lib/icons"
import { isValidNamespace, sanitizeNamespace } from "../../lib/namespaceTag"
import { cn } from "../lib/cn"
import { Button } from "./Button"
import { Popover, PopoverContent, PopoverTrigger } from "./Popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip"

export interface SpaceOption {
	value: string
	label: string
	description?: string
	icon?: ReactNode
}

interface SpaceSelectProps {
	value: string | null
	onValueChange: (value: string) => void
	onCreate?: (value: string) => void
	options: SpaceOption[]
	placeholder?: string
	emptyText?: string
	searchPlaceholder?: string
	disabled?: boolean
	className?: string
}

// Ports console-v2's ChipSelect/ContainerTagSelect: a Popover-anchored,
// searchable list. Scales to hundreds of spaces where chips can't.
export function SpaceSelect({
	value,
	onValueChange,
	onCreate,
	options,
	placeholder = "Select space",
	emptyText = "No spaces",
	searchPlaceholder = onCreate ? "Search or create…" : "Search spaces…",
	disabled = false,
	className,
}: SpaceSelectProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const selected = value ? options.find((o) => o.value === value) : null
	const triggerLabel = selected?.label ?? placeholder

	useEffect(() => {
		if (!open) setQuery("")
	}, [open])

	const filtered = useMemo(() => {
		if (!query.trim()) return options
		const q = query.trim().toLowerCase()
		return options.filter(
			(o) =>
				o.label.toLowerCase().includes(q) ||
				o.value.toLowerCase().includes(q) ||
				(o.description?.toLowerCase().includes(q) ?? false),
		)
	}, [options, query])

	const candidate = sanitizeNamespace(query)
	const canCreate =
		!!onCreate &&
		isValidNamespace(candidate) &&
		!options.some((o) => o.value.toLowerCase() === candidate.toLowerCase())

	const create = () => {
		onCreate?.(candidate)
		setOpen(false)
	}

	return (
		<Tooltip>
			<Popover onOpenChange={setOpen} open={open}>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<Button
							brandFont={false}
							className={cn(
								"space-select-trigger w-full justify-between normal-case tracking-normal font-medium",
								"shadow-[var(--shadow-inset)]",
								"data-[state=open]:border-[var(--border-accent)]",
								className,
							)}
							disabled={disabled}
							iconRight={<ChevronDown className="size-3 text-text-muted" />}
							size="sm"
							type="button"
							variant="secondary"
						>
							<span
								className={cn(
									"flex-1 truncate text-left",
									!selected && "text-text-muted",
								)}
							>
								{triggerLabel}
							</span>
						</Button>
					</PopoverTrigger>
				</TooltipTrigger>
				<PopoverContent
					align="start"
					className="flex w-(--radix-popover-trigger-width) min-w-[260px] max-w-[calc(100vw-16px)] flex-col overflow-hidden p-(--space-1)"
					collisionPadding={8}
					style={{
						maxHeight: "var(--radix-popover-content-available-height)",
					}}
				>
					<div className="mb-(--space-1) flex shrink-0 items-center gap-(--space-2) border-b border-border-muted px-(--space-2) py-(--space-2)">
						<Search className="size-4 text-text-muted shrink-0" />
						<input
							className="w-full bg-transparent text-(length:--text-sm) text-text-primary placeholder:text-text-muted focus:outline-none"
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && canCreate) {
									e.preventDefault()
									create()
								}
							}}
							placeholder={searchPlaceholder}
							value={query}
						/>
					</div>

					<div className="flex min-h-0 max-h-[300px] flex-1 flex-col overflow-y-auto">
						{filtered.length === 0 && !canCreate ? (
							<div className="px-(--space-3) py-(--space-3) text-(length:--text-xs) text-text-muted italic">
								{query ? "No matches" : emptyText}
							</div>
						) : (
							filtered.map((option) => {
								const isSelected = option.value === value
								return (
									<button
										className={cn(
											"flex items-start gap-(--space-2)",
											"px-(--space-3) py-(--space-2)",
											"rounded-(--radius-md)",
											"text-left cursor-pointer transition-colors",
											"hover:bg-bg-muted",
											"focus-visible:outline-none focus-visible:bg-bg-muted",
											isSelected && "bg-accent-muted",
										)}
										key={option.value}
										onClick={() => {
											onValueChange(option.value)
											setOpen(false)
										}}
										type="button"
									>
										<span className="flex min-w-0 flex-col gap-0.5">
											<span className="flex items-center gap-(--space-2)">
												{option.icon ?? null}
												<span
													className={cn(
														"text-(length:--text-sm) truncate",
														isSelected
															? "font-medium text-accent"
															: "text-text-primary",
													)}
												>
													{option.label}
												</span>
											</span>
											{option.description ? (
												<span className="text-(length:--text-xs) text-text-muted truncate">
													{option.description}
												</span>
											) : null}
										</span>
									</button>
								)
							})
						)}
						{canCreate ? (
							<button
								className={cn(
									"flex items-center gap-(--space-2)",
									"px-(--space-3) py-(--space-2)",
									"rounded-(--radius-md)",
									"text-left cursor-pointer transition-colors",
									"hover:bg-bg-muted",
									"focus-visible:outline-none focus-visible:bg-bg-muted",
								)}
								onClick={create}
								type="button"
							>
								<span className="flex size-4 shrink-0 items-center justify-center rounded-(--radius-sm) bg-accent-muted text-accent">
									<Plus className="size-3" />
								</span>
								<span className="min-w-0 flex-1 truncate text-(length:--text-sm) font-medium text-accent">
									Create{" "}
									<span className="font-mono text-(length:--text-xs)">
										{candidate}
									</span>
								</span>
								<kbd className="shrink-0 rounded-(--radius-sm) border border-border px-1 font-mono text-[10px] text-text-muted">
									↵
								</kbd>
							</button>
						) : null}
					</div>
				</PopoverContent>
			</Popover>
			{selected ? (
				<TooltipContent side="top">{selected.value}</TooltipContent>
			) : null}
		</Tooltip>
	)
}
