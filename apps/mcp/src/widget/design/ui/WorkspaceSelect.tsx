import { type ReactNode, useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, Search } from "../../lib/icons"
import { cn } from "../lib/cn"
import { Button } from "./Button"
import { Popover, PopoverContent, PopoverTrigger } from "./Popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip"

export interface WorkspaceOption {
	value: string
	label: string
	description?: string
	icon?: ReactNode
}

interface WorkspaceSelectProps {
	value: string | null
	onValueChange: (value: string) => void
	options: WorkspaceOption[]
	placeholder?: string
	emptyText?: string
	searchPlaceholder?: string
	disabled?: boolean
	className?: string
}

// Ports console-v2's ChipSelect/ContainerTagSelect: a Popover-anchored,
// searchable list. Scales to hundreds of workspaces where chips can't.
export function WorkspaceSelect({
	value,
	onValueChange,
	options,
	placeholder = "Select workspace",
	emptyText = "No workspaces",
	searchPlaceholder = "Search workspaces…",
	disabled = false,
	className,
}: WorkspaceSelectProps) {
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

	return (
		<Tooltip>
			<Popover onOpenChange={setOpen} open={open}>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<Button
							brandFont={false}
							className={cn(
								"workspace-select-trigger mcp-soft-button w-full justify-between normal-case tracking-normal",
								"focus-visible:ring-0 focus-visible:ring-offset-0",
								"data-[state=open]:bg-bg-muted",
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
					className="w-(--radix-popover-trigger-width) min-w-[260px] p-(--space-1)"
				>
					<div className="flex items-center gap-(--space-2) border-b border-border-muted px-(--space-2) py-(--space-2) mb-(--space-1)">
						<Search className="size-4 text-text-muted shrink-0" />
						<input
							className="w-full bg-transparent text-(length:--text-sm) text-text-primary placeholder:text-text-muted focus:outline-none"
							onChange={(e) => setQuery(e.target.value)}
							placeholder={searchPlaceholder}
							value={query}
						/>
					</div>

					<div className="flex max-h-[300px] flex-col overflow-y-auto">
						{filtered.length === 0 ? (
							<div className="px-(--space-3) py-(--space-3) text-(length:--text-xs) text-text-muted italic">
								{query ? "No matches" : emptyText}
							</div>
						) : (
							filtered.map((option) => {
								const isSelected = option.value === value
								return (
									<button
										className={cn(
											"flex items-start justify-between gap-(--space-2)",
											"px-(--space-3) py-(--space-2)",
											"rounded-(--radius-md)",
											"text-left cursor-pointer",
											"hover:bg-bg-muted transition-colors",
											"focus-visible:outline-none focus-visible:bg-bg-muted",
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
												<span className="text-(length:--text-sm) text-text-primary truncate">
													{option.label}
												</span>
											</span>
											{option.description ? (
												<span className="text-(length:--text-xs) text-text-muted truncate">
													{option.description}
												</span>
											) : null}
										</span>
										{isSelected ? (
											<Check className="size-3.5 text-accent shrink-0 mt-0.5" />
										) : null}
									</button>
								)
							})
						)}
					</div>
				</PopoverContent>
			</Popover>
			{selected ? (
				<TooltipContent side="top">{selected.value}</TooltipContent>
			) : null}
		</Tooltip>
	)
}
