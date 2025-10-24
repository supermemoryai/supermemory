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
					viewBox="0 0 24 24"
					fill="none"
				>
					<title>Model Selector</title>
					<g clipPath="url(#clip0_4418_9868)">
						<path
							d="M12.92 2.25984L19.43 5.76984C20.19 6.17984 20.19 7.34984 19.43 7.75984L12.92 11.2698C12.34 11.5798 11.66 11.5798 11.08 11.2698L4.57 7.75984C3.81 7.34984 3.81 6.17984 4.57 5.76984L11.08 2.25984C11.66 1.94984 12.34 1.94984 12.92 2.25984Z"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M3.61 10.1297L9.66 13.1597C10.41 13.5397 10.89 14.3097 10.89 15.1497V20.8697C10.89 21.6997 10.02 22.2297 9.28 21.8597L3.23 18.8297C2.48 18.4497 2 17.6797 2 16.8397V11.1197C2 10.2897 2.87 9.75968 3.61 10.1297Z"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M20.39 10.1297L14.34 13.1597C13.59 13.5397 13.11 14.3097 13.11 15.1497V20.8697C13.11 21.6997 13.98 22.2297 14.72 21.8597L20.77 18.8297C21.52 18.4497 22 17.6797 22 16.8397V11.1197C22 10.2897 21.13 9.75968 20.39 10.1297Z"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</g>
					<defs>
						<clipPath id="clip0_4418_9868">
							<rect width="24" height="24" fill="white" />
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
