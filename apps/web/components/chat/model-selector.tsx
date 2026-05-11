"use client"

import { useState } from "react"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { dmSansClassName } from "@/lib/fonts"
import { ChevronDownIcon } from "lucide-react"
import { models, type ModelId, modelNames } from "@/lib/models"
import { analytics } from "@/lib/analytics"

interface ChatModelSelectorProps {
	selectedModel?: ModelId
	onModelChange?: (model: ModelId) => void
	/** Compact pill matching inline send control. */
	minimal?: boolean
}

export default function ChatModelSelector({
	selectedModel: selectedModelProp,
	onModelChange,
	minimal = false,
}: ChatModelSelectorProps = {}) {
	const [internalModel, setInternalModel] =
		useState<ModelId>("claude-sonnet-4.6")
	const [isOpen, setIsOpen] = useState(false)

	const selectedModel = selectedModelProp ?? internalModel
	const currentModelData = modelNames[selectedModel]

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
				"flex max-w-[min(100%,220px)] min-w-0 shrink cursor-pointer items-center gap-1.5 rounded-full bg-fg-primary/5 px-3 py-1.5 text-sm transition-colors hover:bg-fg-primary/10",
				dmSansClassName(),
			)}
			onClick={() => setIsOpen(!isOpen)}
		>
			<p className="min-w-0 truncate text-left text-fg-primary">
				{currentModelData.name}{" "}
				<span className="text-fg-subtle">{currentModelData.version}</span>
			</p>
			<ChevronDownIcon className="size-3.5 shrink-0 text-fg-subtle" />
		</button>
	) : (
		<Button
			variant="headers"
			className={cn(
				"h-10! max-w-[min(100%,220px)] shrink gap-1 rounded-full border-[#73737333] bg-surface-base text-base",
				dmSansClassName(),
			)}
			style={{
				boxShadow: "1.5px 1.5px 4.5px 0 rgba(0, 0, 0, 0.70) inset",
			}}
			onClick={() => setIsOpen(!isOpen)}
		>
			<p className="truncate text-sm">
				{currentModelData.name}{" "}
				<span className="text-[#737373]">{currentModelData.version}</span>
			</p>
			<ChevronDownIcon className="size-4 text-[#737373]" />
		</Button>
	)

	return (
		<div className="relative flex min-w-0 shrink items-center gap-2">
			{trigger}

			{isOpen && (
				<>
					<button
						type="button"
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
						onKeyDown={(e) => e.key === "Escape" && setIsOpen(false)}
						aria-label="Close model selector"
					/>

					<div className="absolute bottom-full left-0 mb-2 w-64 bg-surface-card backdrop-blur-xl border border-surface-border rounded-lg shadow-xl z-50 overflow-hidden">
						<div className="p-2 space-y-1">
							{models.map((model) => {
								const modelData = modelNames[model.id]
								return (
									<button
										key={model.id}
										type="button"
										className={cn(
											"flex flex-col items-start p-2 px-3 rounded-md transition-colors cursor-pointer w-full text-left",
											selectedModel === model.id
												? "bg-[#293952]/60"
												: "hover:bg-[#293952]/40",
										)}
										onClick={() => handleModelSelect(model.id)}
										onKeyDown={(e) =>
											e.key === "Enter" && handleModelSelect(model.id)
										}
									>
										<div className="text-sm font-medium text-white">
											{modelData.name}{" "}
											<span className="text-fg-subtle">
												{modelData.version}
											</span>
										</div>
										<div className="text-xs text-fg-muted truncate w-full">
											{model.description}
										</div>
									</button>
								)
							})}
						</div>
					</div>
				</>
			)}
		</div>
	)
}
