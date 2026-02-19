"use client"

import { useState, useMemo, useEffect } from "react"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { Dialog, DialogContent } from "@repo/ui/components/dialog"
import { cn } from "@lib/utils"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon, Search, Check } from "lucide-react"
import { Button } from "@ui/components/button"
import { DEFAULT_PROJECT_ID } from "@repo/lib/constants"
import type { ContainerTagListType } from "@repo/lib/types"

interface SelectSpacesModalProps {
	isOpen: boolean
	onClose: () => void
	selectedProjects: string[]
	onApply: (selected: string[]) => void
	projects: ContainerTagListType[]
	singleSelect?: boolean
}

export function SelectSpacesModal({
	isOpen,
	onClose,
	selectedProjects,
	onApply,
	projects,
	singleSelect = false,
}: SelectSpacesModalProps) {
	const [searchQuery, setSearchQuery] = useState("")
	const [localSelection, setLocalSelection] =
		useState<string[]>(selectedProjects)

	useEffect(() => {
		if (isOpen) {
			setLocalSelection(selectedProjects)
		}
	}, [isOpen, selectedProjects])

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			onClose()
			setSearchQuery("")
			setLocalSelection(selectedProjects)
		}
	}

	const handleToggle = (containerTag: string) => {
		if (singleSelect) {
			setLocalSelection([containerTag])
			return
		}
		setLocalSelection((prev) => {
			if (prev.includes(containerTag)) {
				return prev.filter((tag) => tag !== containerTag)
			}
			return [...prev, containerTag]
		})
	}

	const handleApply = () => {
		onApply(localSelection)
		setSearchQuery("")
	}

	const handleCancel = () => {
		onClose()
		setSearchQuery("")
		setLocalSelection(selectedProjects)
	}

	const filteredProjects = useMemo(() => {
		const defaultSpace = {
			id: "default",
			name: "My Space",
			emoji: "📁",
			containerTag: DEFAULT_PROJECT_ID,
		}

		const allSpaces = [
			defaultSpace,
			...projects.filter((p) => p.containerTag !== DEFAULT_PROJECT_ID),
		]

		let result = allSpaces
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase()
			result = allSpaces.filter(
				(p) =>
					p.containerTag.toLowerCase().includes(query) ||
					p.name?.toLowerCase().includes(query),
			)
		}

		return result.sort((a, b) => {
			const aSelected = localSelection.includes(a.containerTag)
			const bSelected = localSelection.includes(b.containerTag)
			if (aSelected && !bSelected) return -1
			if (!aSelected && bSelected) return 1
			return 0
		})
	}, [projects, searchQuery, localSelection])

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent
				className={cn(
					"w-[90%]! max-w-[500px]! border-none bg-[#1B1F24] flex flex-col p-4 gap-4 rounded-[22px]",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<div className="flex flex-col gap-4">
					<div className="flex justify-between items-start gap-4">
						<div className="pl-1 space-y-1 flex-1">
							<p
								className={cn(
									"font-semibold text-[#fafafa]",
									dmSans125ClassName(),
								)}
							>
								Select Space{!singleSelect && "s"}
							</p>
							<p className="text-[#737373] font-medium text-[16px] leading-[1.35]">
								{singleSelect
									? "Choose a space for your memory"
									: "Choose one or more spaces to filter your memories"}
							</p>
						</div>
						<DialogPrimitive.Close
							className="bg-[#0D121A] w-7 h-7 flex items-center justify-center focus:ring-ring rounded-full transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border border-[rgba(115,115,115,0.2)] shrink-0"
							style={{
								boxShadow: "inset 1.313px 1.313px 3.938px 0px rgba(0,0,0,0.7)",
							}}
						>
							<XIcon stroke="#737373" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					</div>

					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#737373]" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search spaces..."
							className={cn(
								"w-full bg-[#14161A] border border-[rgba(82,89,102,0.2)] pl-10 pr-4 py-3 rounded-[12px] text-[#fafafa] text-[14px] placeholder:text-[#737373] focus:outline-none focus:ring-1 focus:ring-[rgba(115,115,115,0.3)]",
								dmSansClassName(),
							)}
							style={{
								boxShadow:
									"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
							}}
							autoFocus
						/>
					</div>

					<div className="max-h-[300px] overflow-y-auto space-y-1 scrollbar-thin">
						{filteredProjects.length === 0 ? (
							<p className="text-center text-[#737373] text-sm py-4">
								No spaces found
							</p>
						) : (
							filteredProjects.map((project) => {
								const isSelected = localSelection.includes(project.containerTag)
								return (
									<button
										key={project.containerTag}
										type="button"
										onClick={() => handleToggle(project.containerTag)}
										className={cn(
											"flex items-center gap-3 w-full px-3 py-2.5 rounded-[12px] cursor-pointer transition-colors text-left",
											isSelected
												? "bg-[#14161A] border border-[rgba(82,89,102,0.3)]"
												: "bg-transparent border border-transparent hover:bg-[#14161A]/50",
										)}
									>
										{singleSelect ? (
											<div
												className={cn(
													"w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
													isSelected ? "border-blue-500" : "border-[#737373]",
												)}
											>
												{isSelected && (
													<div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
												)}
											</div>
										) : (
											<div
												className={cn(
													"w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
													isSelected
														? "bg-blue-500 border-blue-500"
														: "border-[#737373]",
												)}
											>
												{isSelected && <Check className="size-3 text-white" />}
											</div>
										)}
										<span className="text-lg">{project.emoji || "📁"}</span>
										<span className="text-[#fafafa] text-sm font-medium truncate flex-1">
											{project.name ?? project.containerTag}
										</span>
									</button>
								)
							})
						)}
					</div>

					<div className="flex items-center justify-between">
						<p className="text-[#737373] text-sm">
							{singleSelect
								? localSelection.length === 0
									? "No space selected"
									: "1 space selected"
								: localSelection.length === 0
									? "No spaces selected (showing all)"
									: `${localSelection.length} space${localSelection.length > 1 ? "s" : ""} selected`}
						</p>
						<div className="flex items-center gap-[22px]">
							<button
								type="button"
								onClick={handleCancel}
								className={cn(
									"text-[#737373] font-medium text-[14px] cursor-pointer transition-colors hover:text-[#999]",
									dmSansClassName(),
								)}
							>
								Cancel
							</button>
							<Button
								variant="insideOut"
								onClick={handleApply}
								className="px-4 py-[10px] rounded-full"
							>
								Apply
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
