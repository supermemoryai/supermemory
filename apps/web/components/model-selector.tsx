"use client"

import { useState } from "react"
import { Button } from "@repo/ui/components/button"
import { ChevronDown } from "lucide-react"
import { motion } from "motion/react"
import { models, type ModelId, ModelIcon } from "@/lib/models"

interface ModelSelectorProps {
	selectedModel?: ModelId
	onModelChange?: (modelId: ModelId) => void
	disabled?: boolean
}

export function ModelSelector({
	selectedModel = "gemini-2.5-pro",
	onModelChange,
	disabled = false,
}: ModelSelectorProps) {
	const [isOpen, setIsOpen] = useState(false)

	const currentModel = models.find((m) => m.id === selectedModel) || models[0]

	const handleModelSelect = (modelId: ModelId) => {
		onModelChange?.(modelId)
		setIsOpen(false)
	}

	return (
		<div className="relative">
			<Button
				type="button"
				variant="ghost"
				className="flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors"
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
			>
				<ModelIcon width={24} height={24} />
				<span className="text-xs font-medium max-w-32 truncate">
					{currentModel.name}
				</span>
				<motion.div
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={{ duration: 0.25 }}
				>
					<ChevronDown className="h-3 w-3" />
				</motion.div>
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

					<div className="absolute top-full left-0 mt-1 w-64 bg-background/95 backdrop-blur-xl border border-border rounded-md shadow-xl z-50 overflow-hidden space-y-1">
						<div className="p-1.5 space-y-1">
							{models.map((model) => (
								<button
									key={model.id}
									type="button"
									className={`flex items-center p-1 px-2 rounded-md transition-colors cursor-pointer w-full text-left ${
										selectedModel === model.id
											? "bg-accent"
											: "hover:bg-accent/50"
									}`}
									onClick={() => handleModelSelect(model.id)}
									onKeyDown={(e) =>
										e.key === "Enter" && handleModelSelect(model.id)
									}
								>
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium text-foreground">
											{model.name}
										</div>
										<div className="text-xs text-muted-foreground truncate">
											{model.description}
										</div>
									</div>
								</button>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	)
}
