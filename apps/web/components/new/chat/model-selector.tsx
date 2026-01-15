"use client"

import { useState } from "react"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { dmSansClassName } from "@/lib/fonts"
import { ChevronDownIcon } from "lucide-react"
import { models, type ModelId, modelNames } from "@/lib/models"

interface ChatModelSelectorProps {
	selectedModel?: ModelId
	onModelChange?: (model: ModelId) => void
}

export default function ChatModelSelector({
	selectedModel: selectedModelProp,
	onModelChange,
}: ChatModelSelectorProps = {}) {
	const [internalModel, setInternalModel] = useState<ModelId>("gemini-2.5-pro")
	const [isOpen, setIsOpen] = useState(false)

	const selectedModel = selectedModelProp ?? internalModel
	const currentModelData = modelNames[selectedModel]

	const handleModelSelect = (modelId: ModelId) => {
		if (onModelChange) {
			onModelChange(modelId)
		} else {
			setInternalModel(modelId)
		}
		setIsOpen(false)
	}

	return (
		<div className="relative flex items-center gap-2">
			<Button
				variant="headers"
				className={cn(
					"rounded-full text-base gap-1 h-10! border-[#73737333] bg-[#0D121A]",
					dmSansClassName(),
				)}
				style={{
					boxShadow: "1.5px 1.5px 4.5px 0 rgba(0, 0, 0, 0.70) inset",
				}}
				onClick={() => setIsOpen(!isOpen)}
			>
				<p className="text-sm">
					{currentModelData.name}{" "}
					<span className="text-[#737373]">{currentModelData.version}</span>
				</p>
				<ChevronDownIcon className="size-4 text-[#737373]" />
			</Button>

			{isOpen && (
				<>
					<button
						type="button"
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
						onKeyDown={(e) => e.key === "Escape" && setIsOpen(false)}
						aria-label="Close model selector"
					/>

					<div className="absolute top-full left-0 mt-2 w-64 bg-[#0D121A] backdrop-blur-xl border border-[#73737333] rounded-lg shadow-xl z-50 overflow-hidden">
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
											<span className="text-[#737373]">
												{modelData.version}
											</span>
										</div>
										<div className="text-xs text-[#737373] truncate w-full">
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
