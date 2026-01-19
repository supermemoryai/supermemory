"use client"

import { useState, useMemo } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { $fetch } from "@repo/lib/api"
import { DEFAULT_PROJECT_ID } from "@repo/lib/constants"
import { useQuery } from "@tanstack/react-query"
import { ChevronsLeftRight, Plus } from "lucide-react"
import type { Project } from "@repo/lib/types"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"

export interface SpaceSelectorProps {
	value: string
	onValueChange: (containerTag: string) => void
	variant?: "default" | "insideOut"
	showChevron?: boolean
	triggerClassName?: string
	contentClassName?: string
	showNewSpace?: boolean
}

const triggerVariants = {
	default: "px-3 py-2 rounded-md hover:bg-white/5",
	insideOut: "px-3 py-2 rounded-full bg-[#0D121A] shadow-inside-out",
}

export function SpaceSelector({
	value,
	onValueChange,
	variant = "default",
	showChevron = false,
	triggerClassName,
	contentClassName,
	showNewSpace = true,
}: SpaceSelectorProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [showCreateDialog, setShowCreateDialog] = useState(false)

	const { data: projects = [], isLoading } = useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const response = await $fetch("@get/projects")

			if (response.error) {
				throw new Error(response.error?.message || "Failed to load projects")
			}

			return response.data?.projects || []
		},
		staleTime: 30 * 1000,
	})

	const selectedProjectName = useMemo(() => {
		if (value === DEFAULT_PROJECT_ID) return "My Space"
		const found = projects.find((p: Project) => p.containerTag === value)
		return found?.name ?? value
	}, [projects, value])

	const handleSelect = (containerTag: string) => {
		onValueChange(containerTag)
		setIsOpen(false)
	}

	const handleNewSpace = () => {
		setIsOpen(false)
		setShowCreateDialog(true)
	}

	return (
		<>
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className={cn(
							"flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
							triggerVariants[variant],
							dmSansClassName(),
							triggerClassName,
						)}
					>
						<span className="text-sm font-bold tracking-[-0.98px]">📁</span>
						<span className="text-sm font-medium text-white">
							{isLoading ? "..." : selectedProjectName}
						</span>
						{showChevron && (
							<ChevronsLeftRight className="size-4 rotate-90 text-white/70" />
						)}
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="start"
					className={cn(
						"min-w-[200px] p-3 rounded-[11px] border border-[#2E3033] shadow-[0px_1.5px_20px_0px_rgba(0,0,0,0.65)]",
						dmSansClassName(),
						contentClassName,
					)}
					style={{
						background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
					}}
				>
					<div className="flex flex-col gap-3">
						<div className="flex flex-col">
							{/* Default Project */}
							<DropdownMenuItem
								onClick={() => handleSelect(DEFAULT_PROJECT_ID)}
								className={cn(
									"flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-white text-sm font-medium",
									value === DEFAULT_PROJECT_ID
										? "bg-[#161E2B] border border-[rgba(115,115,115,0.1)]"
										: "opacity-50 hover:opacity-100 hover:bg-[#161E2B]/50",
								)}
							>
								<span className="font-bold tracking-[-0.98px]">📁</span>
								<span>My Space</span>
							</DropdownMenuItem>

							{/* User Projects */}
							{projects
								.filter((p: Project) => p.containerTag !== DEFAULT_PROJECT_ID)
								.map((project: Project) => (
									<DropdownMenuItem
										key={project.id}
										onClick={() => handleSelect(project.containerTag)}
										className={cn(
											"flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-white text-sm font-medium",
											value === project.containerTag
												? "bg-[#161E2B] border border-[rgba(115,115,115,0.1)]"
												: "opacity-50 hover:opacity-100 hover:bg-[#161E2B]/50",
										)}
									>
										<span className="font-bold tracking-[-0.98px]">📁</span>
										<span className="truncate">{project.name}</span>
									</DropdownMenuItem>
								))}
						</div>

						{showNewSpace && (
							<button
								type="button"
								onClick={handleNewSpace}
								className="flex items-center justify-center gap-2 px-3 py-2 rounded-md cursor-pointer text-white text-sm font-medium border border-[#161F2C] hover:bg-[#0D121A]/80 transition-colors"
								style={{
									background:
										"linear-gradient(180deg, #0D121A 0%, #000000 100%)",
								}}
							>
								<Plus className="size-4" />
								<span>New Space</span>
							</button>
						)}
					</div>
				</DropdownMenuContent>
			</DropdownMenu>

			<CreateProjectDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
			/>
		</>
	)
}
