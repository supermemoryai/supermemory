"use client"

import { useState } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName, dmSans125ClassName } from "@/lib/fonts"
import { Button } from "@ui/components/button"
import { MCPDetailView } from "@/components/new/mcp-modal/mcp-detail-view"
import { XBookmarksDetailView } from "@/components/new/onboarding/x-bookmarks-detail-view"
import { ChromeDetail } from "@/components/new/integrations/chrome-detail"
import { ShortcutsDetail } from "@/components/new/integrations/shortcuts-detail"
import { RaycastDetail } from "@/components/new/integrations/raycast-detail"
import { ConnectionsDetail } from "@/components/new/integrations/connections-detail"
import { PluginsDetail } from "@/components/new/integrations/plugins-detail"
import {
	ChromeIcon,
	AppleShortcutsIcon,
	RaycastIcon,
} from "@/components/new/integration-icons"
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons"
import { Cable, ArrowLeft } from "lucide-react"
import Image from "next/image"

type CardId =
	| "mcp"
	| "chrome"
	| "connections"
	| "shortcuts"
	| "raycast"
	| "import"
	| "plugins"

interface IntegrationCardDef {
	id: CardId
	title: string
	description: string
	icon: React.ReactNode
	pro?: boolean
}

const cards: IntegrationCardDef[] = [
	{
		id: "plugins",
		title: "Plugins",
		description: "Claude Code, OpenCode, and other AI tool integrations",
		pro: true,
		icon: (
			<div className="flex items-center -space-x-1.5">
				<Image src="/images/plugins/claude-code.svg" alt="Claude Code" width={24} height={24} className="size-6 rounded" />
				<Image src="/images/plugins/opencode.svg" alt="OpenCode" width={24} height={24} className="size-6 rounded" />
				<Image src="/images/plugins/clawdbot.svg" alt="ClawdBot" width={24} height={24} className="size-6 rounded" />
			</div>
		),
	},
	{
		id: "connections",
		title: "Connections",
		description: "Link Notion, Google Drive, or OneDrive to import your docs",
		pro: true,
		icon: (
			<div className="flex items-center -space-x-1">
				<GoogleDrive className="size-5" />
				<Notion className="size-5" />
				<OneDrive className="size-5" />
			</div>
		),
	},
	{
		id: "mcp",
		title: "Connect to AI",
		description: "Set up MCP to use your memory in Cursor, Claude, and more",
		icon: (
			<img
				src="/onboarding/mcp.png"
				alt="MCP"
				className="size-20 h-auto"
			/>
		),
	},
	{
		id: "chrome",
		title: "Chrome Extension",
		description: "Save any webpage, import bookmarks, sync ChatGPT memories",
		icon: <ChromeIcon className="size-14" />,
	},
	{
		id: "shortcuts",
		title: "Apple Shortcuts",
		description: "Add memories directly from iPhone, iPad or Mac",
		icon: <AppleShortcutsIcon />,
	},
	{
		id: "raycast",
		title: "Raycast",
		description: "Add and search memories from Raycast on Mac",
		icon: <RaycastIcon className="size-10" />,
	},
	{
		id: "import",
		title: "Import Bookmarks",
		description: "Bring in X/Twitter bookmarks and turn them into memories",
		icon: (
			<img src="/onboarding/x.png" alt="X" className="size-10" />
		),
	},
]

function DetailWrapper({
	onBack,
	children,
}: {
	onBack: () => void
	children: React.ReactNode
}) {
	return (
		<div className="flex-1 p-4 md:p-6 pt-2">
			<div className="max-w-3xl mx-auto">
				<Button
					variant="link"
					className="text-white hover:text-gray-300 p-0 hover:no-underline cursor-pointer mb-4"
					onClick={onBack}
				>
					<ArrowLeft className="size-4 mr-1" />
					Back to Integrations
				</Button>
				{children}
			</div>
		</div>
	)
}

export function IntegrationsView() {
	const [selectedCard, setSelectedCard] = useState<CardId | null>(null)

	if (selectedCard === "mcp") {
		return <MCPDetailView onBack={() => setSelectedCard(null)} />
	}
	if (selectedCard === "import") {
		return <XBookmarksDetailView onBack={() => setSelectedCard(null)} />
	}
	if (selectedCard === "chrome") {
		return (
			<DetailWrapper onBack={() => setSelectedCard(null)}>
				<ChromeDetail />
			</DetailWrapper>
		)
	}
	if (selectedCard === "shortcuts") {
		return (
			<DetailWrapper onBack={() => setSelectedCard(null)}>
				<ShortcutsDetail />
			</DetailWrapper>
		)
	}
	if (selectedCard === "raycast") {
		return (
			<DetailWrapper onBack={() => setSelectedCard(null)}>
				<RaycastDetail />
			</DetailWrapper>
		)
	}
	if (selectedCard === "connections") {
		return (
			<DetailWrapper onBack={() => setSelectedCard(null)}>
				<ConnectionsDetail />
			</DetailWrapper>
		)
	}
	if (selectedCard === "plugins") {
		return (
			<DetailWrapper onBack={() => setSelectedCard(null)}>
				<PluginsDetail />
			</DetailWrapper>
		)
	}

	return (
		<div className="flex-1 p-4 md:p-6 pt-2">
			<div className="max-w-3xl mx-auto">
				<div className="mb-6 space-y-1">
					<div className="flex items-center gap-2">
						<Cable className="size-5 text-[#4BA0FA]" />
						<h2 className="text-white text-xl font-medium">Integrations</h2>
					</div>
					<p
						className={cn(
							"text-[#8B8B8B] text-sm",
							dmSansClassName(),
						)}
					>
						Connect supermemory to your tools and workflows
					</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{cards.map((card) => (
						<button
							key={card.id}
							type="button"
							onClick={() => setSelectedCard(card.id)}
							className={cn(
								"bg-[#080B0F] relative rounded-xl p-4 pt-14",
								"border border-[#0D121A]",
								"hover:border-[#3374FF]/50",
								"transition-all duration-300 cursor-pointer text-left w-full",
								"hover:bg-[url('/onboarding/bg-gradient-1.png')] hover:bg-[length:200%_auto] hover:bg-[center_top_1rem] hover:bg-no-repeat",
								"group",
							)}
						>
							{card.pro && (
								<span className="absolute top-3 left-3 bg-[#4BA0FA] text-[#00171A] text-[10px] font-bold tracking-[0.3px] px-1.5 py-0.5 rounded-[3px]">
									PRO
								</span>
							)}
							<div className="absolute top-2 right-2 opacity-60 group-hover:opacity-100 transition-opacity">
								{card.icon}
							</div>
							<div className="flex-1">
								<h3 className="text-white text-sm font-medium">
									{card.title}
								</h3>
								<p
									className={cn(
										"text-[#8B8B8B] text-xs leading-relaxed mt-0.5",
										dmSansClassName(),
									)}
								>
									{card.description}
								</p>
							</div>
						</button>
					))}
				</div>
			</div>
		</div>
	)
}
