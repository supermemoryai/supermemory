"use client"

import { useState } from "react"
import { Button } from "@ui/components/button"
import { MCPDetailView } from "@/components/mcp-detail-view"
import { XBookmarksDetailView } from "@/components/x-bookmarks-detail-view"
import { useRouter } from "next/navigation"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"
import { useOnboardingStorage } from "@hooks/use-onboarding-storage"

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
				<img src="/onboarding/mcp.png" alt="MCP" className="size-28 h-auto" />
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

export function IntegrationsStep() {
	const router = useRouter()
	const [selectedCard, setSelectedCard] = useState<string | null>(null)
	const { markOnboardingCompleted } = useOnboardingStorage()

	const handleContinue = () => {
		markOnboardingCompleted()
		router.push("/new")
	}

	if (selectedCard === "Connect to AI") {
		return <MCPDetailView onBack={() => setSelectedCard(null)} />
	}
	if (selectedCard === "Import") {
		return <XBookmarksDetailView onBack={() => setSelectedCard(null)} />
	}
	return (
		<div className="flex flex-col items-center justify-center h-full p-8">
			<div className="text-center mb-6 flex flex-col items-center justify-center space-y-2">
				<h1 className="text-white text-[32px] font-medium">
					Build your personal memory
				</h1>
				<p
					className={cn(
						"text-white text-sm opacity-60 max-w-xs",
						dmSansClassName(),
					)}
				>
					Your supermemory comes alive when you <br /> capture and connect
					what's important
				</p>
			</div>

			<div className="grid grid-cols-2 gap-3 max-w-lg w-full mb-12">
				{integrationCards.map((card) => {
					const isClickable =
						card.title === "Connect to AI" ||
						card.title === "Capture" ||
						card.title === "Import"

					if (isClickable) {
						return (
							<button
								key={card.title}
								type="button"
								className={cn(
									"bg-[#080B0F] relative rounded-lg p-3 hover:border-[#3374FF] hover:border-[0.1px] transition-colors duration-300 border-[0.1px] border-[#0D121A] cursor-pointer text-left w-full hover:bg-[url('/onboarding/bg-gradient-1.png')] hover:bg-[length:175%_auto] hover:bg-[center_top_2rem] hover:bg-no-repeat",
									"hover:border-b-0 border-b-0",
								)}
								onClick={() => {
									if (card.title === "Capture") {
										window.open(
											"https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc",
											"_blank",
										)
									} else {
										setSelectedCard(card.title)
									}
								}}
							>
								<div className="flex-1 mt-10">
									<h3 className="text-white text-sm font-medium">
										{card.title}
									</h3>
									<p
										className={cn(
											"text-[#8B8B8B] text-xs leading-relaxed",
											dmSansClassName(),
										)}
									>
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
							className={cn(
								"bg-[#080B0F] relative rounded-lg p-3 hover:border-[#3374FF] hover:border-[0.1px] transition-colors duration-300 border-[0.1px] border-[#0D121A] hover:bg-[url('/onboarding/bg-gradient-1.png')] hover:bg-[length:175%_auto] hover:bg-[center_top_2rem] hover:bg-no-repeat",
								"hover:border-b-0 border-b-0",
							)}
						>
							<div className="flex-1 mt-10">
								<h3 className="text-white text-sm font-medium">{card.title}</h3>
								<p
									className={cn(
										"text-[#8B8B8B] text-xs leading-relaxed",
										dmSansClassName(),
									)}
								>
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
					className="text-white hover:text-gray-300 hover:no-underline cursor-pointer"
					onClick={() => router.push("/onboarding?flow=setup&step=relatable")}
				>
					← Back
				</Button>
				<Button
					variant="link"
					className="text-white hover:text-gray-300 hover:no-underline cursor-pointer"
					onClick={handleContinue}
				>
					Continue →
				</Button>
			</div>
		</div>
	)
}
