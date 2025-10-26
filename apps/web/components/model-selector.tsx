"use client"

import { useState } from "react"
import { Button } from "@repo/ui/components/button"
import { ChevronDown } from "lucide-react"
import { motion } from "motion/react"

const models = [
	{
		id: "gpt-5",
		name: "GPT 5",
		description: "OpenAI's latest model",
	},
	{
		id: "claude-sonnet-4.5",
		name: "Claude Sonnet 4.5",
		description: "Anthropic's advanced model",
	},
	{
		id: "gemini-2.5-pro",
		name: "Gemini 2.5 Pro",
		description: "Google's most capable model",
	},
] as const

type ModelId = (typeof models)[number]["id"]

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
				<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				fill="none"
				viewBox="0 0 24 24"
				>
				<g
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					clipPath="url(#clip0_4418_9868)"
				>
					<path d="m12.92 2.26 6.51 3.51c.76.41.76 1.58 0 1.99l-6.51 3.51c-.58.31-1.26.31-1.84 0L4.57 7.76c-.76-.41-.76-1.58 0-1.99l6.51-3.51c.58-.31 1.26-.31 1.84 0M3.61 10.13l6.05 3.03c.75.38 1.23 1.15 1.23 1.99v5.72c0 .83-.87 1.36-1.61.99l-6.05-3.03A2.24 2.24 0 0 1 2 16.84v-5.72c0-.83.87-1.36 1.61-.99M20.39 10.13l-6.05 3.03c-.75.38-1.23 1.15-1.23 1.99v5.72c0 .83.87 1.36 1.61.99l6.05-3.03c.75-.38 1.23-1.15 1.23-1.99v-5.72c0-.83-.87-1.36-1.61-.99"></path>
				</g>
				<defs>
					<clipPath id="clip0_4418_9868">
					<path fill="#fff" d="M0 0h24v24H0z"></path>
					</clipPath>
				</defs>
				</svg>
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
