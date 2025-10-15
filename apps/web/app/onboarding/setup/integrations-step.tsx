"use client"

import { useState } from "react"
import { Button } from "@ui/components/button"
import { MCPDetailView } from "@/components/mcp-detail-view"

const integrationCards = [
	{
		title: "Capture",
		description: "Add the Chrome extension for one-click saves",
		icon: (
			<div className="rounded-full flex items-center justify-center">
				<img
					src="/onboarding/chrome.png"
					alt="Chrome"
					className="w-20 h-auto"
				/>
			</div>
		),
	},
	{
		title: "Connect to AI",
		description: "Set up once and use your memory in Cursor, Claude, etc",
		icon: (
			<div className="rounded flex items-center justify-center">
				<img src="/mcp-icon.svg" alt="MCP" className="size-14" />
			</div>
		),
	},
	{
		title: "Connect",
		description: "Link Notion, Google Drive, or OneDrive to import your docs",
		icon: (
			<div className="rounded flex items-center justify-center">
				<img
					src="/onboarding/connectors.png"
					alt="Connectors"
					className="w-20 h-auto"
				/>
			</div>
		),
	},
	{
		title: "Import",
		description:
			"Bring in X/Twitter bookmarks, and turn them into useful memories",
		icon: (
			<div className="rounded flex items-center justify-center">
				<img src="/onboarding/x.png" alt="X" className="size-14" />
			</div>
		),
	},
]

interface IntegrationsStepProps {
	onBack: () => void
}

export function IntegrationsStep({ onBack }: IntegrationsStepProps) {
	const [selectedCard, setSelectedCard] = useState<string | null>(null)

	if (selectedCard === "Connect to AI") {
		return <MCPDetailView onBack={() => setSelectedCard(null)} />
	}
	return (
		<div className="flex flex-col items-center justify-center h-full p-8">
			<div className="text-center mb-6 flex flex-col items-center justify-center space-y-2">
				<h1 className="text-white text-3xl font-medium">
					Build your personal memory
				</h1>
				<p className="text-white text-sm opacity-60 max-w-xs">
					Your supermemory comes alive when you capture and connect what's
					important
				</p>
			</div>

			<div className="grid grid-cols-2 gap-2 max-w-lg w-full mb-12">
				{integrationCards.map((card) => {
					const isClickable = card.title === "Connect to AI"

					if (isClickable) {
						return (
							<button
								key={card.title}
								type="button"
								className="bg-[#080B0F] relative rounded-lg p-4 hover:border-gray-600 transition-colors duration-300 border-2 border-[#0D121A] cursor-pointer text-left w-full hover:bg-[url('/onboarding/bg-gradient-1.png')] hover:bg-[length:250%_auto] hover:bg-[center_top_3rem] hover:bg-no-repeat"
								onClick={() => setSelectedCard("Connect to AI")}
							>
								<div className="flex-1 mt-10">
									<h3 className="text-white text-sm font-medium">
										{card.title}
									</h3>
									<p className="text-gray-400 text-xs leading-relaxed">
										{card.description}
									</p>
								</div>
								<div className="absolute top-0 right-0">{card.icon}</div>
							</button>
						)
					}

					return (
						<div
							key={card.title}
							className="bg-[#080B0F] relative rounded-lg p-4 hover:border-gray-600 transition-colors duration-300 border-2 border-[#0D121A] hover:bg-[url('/onboarding/bg-gradient-1.png')] hover:bg-[length:250%_auto] hover:bg-[center_top_3rem] hover:bg-no-repeat"
						>
							<div className="flex-1 mt-10">
								<h3 className="text-white text-sm font-medium">{card.title}</h3>
								<p className="text-gray-400 text-xs leading-relaxed">
									{card.description}
								</p>
							</div>
							<div className="absolute top-0 right-0">{card.icon}</div>
						</div>
					)
				})}
			</div>

			<div className="flex justify-between w-full max-w-4xl">
				<Button
					variant="link"
					className="text-white hover:text-gray-300"
					onClick={onBack}
				>
					← Back
				</Button>
				<Button variant="link" className="text-white hover:text-gray-300">
					Continue →
				</Button>
			</div>
		</div>
	)
}
