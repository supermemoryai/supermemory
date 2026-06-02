"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { dmSansClassName } from "@/lib/fonts"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { models, type ModelId, modelNames } from "@/lib/models"
import { analytics } from "@/lib/analytics"

interface ChatModelSelectorProps {
	selectedModel?: ModelId
	onModelChange?: (model: ModelId) => void
	/** Compact pill matching inline send control. */
	minimal?: boolean
	dropdownDirection?: "up" | "down"
}

export default function ChatModelSelector({
	selectedModel: selectedModelProp,
	onModelChange,
	minimal = false,
	dropdownDirection = "up",
}: ChatModelSelectorProps = {}) {
	const [internalModel, setInternalModel] =
		useState<ModelId>("claude-sonnet-4.6")
	const [isOpen, setIsOpen] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!isOpen) return
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false)
			}
		}
		document.addEventListener("mousedown", handleClickOutside)
		return () => document.removeEventListener("mousedown", handleClickOutside)
	}, [isOpen])

	const selectedModel = selectedModelProp ?? internalModel
	const currentModelData = modelNames[selectedModel]
	const selectedModelLabel = `${currentModelData.name} ${currentModelData.version}`
	const selectedItemClass =
		"border border-[#267BF1]/35 bg-[#0A1A3A] text-white shadow-[inset_0_0_0_1px_rgba(75,160,250,0.08)]"

	const handleModelSelect = (modelId: ModelId) => {
		if (onModelChange) {
			onModelChange(modelId)
		} else {
			setInternalModel(modelId)
		}
		analytics.modelChanged({ model: modelId })
		setIsOpen(false)
	}

	const trigger = minimal ? (
		<button
			type="button"
			className={cn(
				"flex max-w-[min(100%,220px)] min-w-0 shrink cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-black px-3 py-1.5 text-sm text-white transition-colors hover:border-white/30 hover:bg-white/5",
				dmSansClassName(),
			)}
			onClick={() => setIsOpen(!isOpen)}
			aria-expanded={isOpen}
			aria-label={`Model: ${selectedModelLabel}`}
		>
			<p className="min-w-0 truncate text-left text-white">
				{currentModelData.name}{" "}
				<span className="text-white/55">{currentModelData.version}</span>
			</p>
			<ChevronDownIcon className="size-3.5 shrink-0 text-white/55" />
		</button>
	) : (
		<Button
			variant="headers"
			className={cn(
				"h-10! max-w-[min(100%,220px)] shrink gap-1.5 rounded-full border-white/15 bg-black text-base text-white shadow-none transition-colors hover:border-white/30 hover:bg-white/5",
				dmSansClassName(),
			)}
			onClick={() => setIsOpen(!isOpen)}
			aria-expanded={isOpen}
			aria-label={`Model: ${selectedModelLabel}`}
		>
			<p className="truncate text-sm">
				{currentModelData.name}{" "}
				<span className="text-white/55">{currentModelData.version}</span>
			</p>
			<ChevronDownIcon className="size-4 text-white/55" />
		</Button>
	)

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative flex min-w-0 shrink items-center gap-2",
				isOpen ? "z-[1000]" : "z-10",
			)}
		>
			{trigger}

			{isOpen && (
				<div
					className={cn(
						"isolate absolute left-0 z-[1000] w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/15 bg-black p-1 shadow-[0_18px_48px_rgba(0,0,0,0.55)]",
						dropdownDirection === "up" ? "bottom-full mb-2" : "top-full mt-2",
					)}
				>
					<div className="space-y-1">
						{models.map((model) => {
							const modelData = modelNames[model.id]
							const isSelected = selectedModel === model.id
							return (
								<button
									key={model.id}
									type="button"
									className={cn(
										"flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors",
										isSelected
											? selectedItemClass
											: "text-white hover:bg-white/10",
									)}
									onClick={() => handleModelSelect(model.id)}
									onKeyDown={(e) =>
										e.key === "Enter" && handleModelSelect(model.id)
									}
								>
									<div className="min-w-0 flex-1">
										<div
											className={cn(
												"truncate text-[15px] font-medium",
												isSelected ? "text-white" : "text-white",
											)}
										>
											{modelData.name}{" "}
											<span
												className={cn(
													isSelected ? "text-[#8DBDFF]" : "text-white/55",
												)}
											>
												{modelData.version}
											</span>
										</div>
										<div
											className={cn(
												"mt-0.5 truncate text-xs",
												isSelected ? "text-white/60" : "text-white/45",
											)}
										>
											{model.description}
										</div>
									</div>
									{isSelected && (
										<CheckIcon className="size-4 shrink-0 text-[#8DBDFF]" />
									)}
								</button>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}
