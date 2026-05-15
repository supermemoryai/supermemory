"use client"

import { useQuery } from "@tanstack/react-query"
import { useCustomer } from "autumn-js/react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { hasActivePlan } from "@lib/queries"
import { $fetch } from "@lib/api"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import type { ConnectionResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { Button } from "@ui/components/button"
import {
	ChromeIcon,
	AppleShortcutsIcon,
	RaycastIcon,
} from "@/components/integration-icons"
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons"
import { ArrowLeft, Sun } from "lucide-react"
import { CHROME_EXTENSION_URL } from "@repo/lib/constants"
import { analytics } from "@/lib/analytics"
import Image from "next/image"
import { IntegrationGridCard } from "@/components/integrations/integration-grid-card"
import { useViewMode } from "@/lib/view-mode-context"
import { addDocumentParam, type ViewParamValue } from "@/lib/search-params"
import { useQueryState } from "nuqs"

type Connection = z.infer<typeof ConnectionResponseSchema>

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
	externalHref?: string
}

const cards: IntegrationCardDef[] = [
	{
		id: "plugins",
		title: "Plugins",
		description:
			"Hermes on every plan; Claude Code, Codex, OpenCode, OpenClaw, and more with Pro",
		icon: (
			<div className="flex items-center -space-x-1.5">
				<Image
					src="/images/plugins/claude-code.svg"
					alt="Claude Code"
					width={24}
					height={24}
					className="size-6 rounded"
				/>
				<Image
					src="/images/plugins/codex.png"
					alt="Codex"
					width={24}
					height={24}
					className="size-6 rounded"
				/>
				<Image
					src="/images/plugins/opencode.svg"
					alt="OpenCode"
					width={24}
					height={24}
					className="size-6 rounded"
				/>
				<Image
					src="/images/plugins/openclaw.svg"
					alt="OpenClaw"
					width={24}
					height={24}
					className="size-6 rounded"
				/>
				<Image
					src="/images/plugins/hermes.svg"
					alt="Hermes"
					width={24}
					height={24}
					className="size-6 rounded"
				/>
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
			<img src="/onboarding/mcp.png" alt="MCP" className="size-20 h-auto" />
		),
	},
	{
		id: "chrome",
		title: "Chrome Extension",
		description: "Save any webpage, import bookmarks, sync ChatGPT memories",
		icon: <ChromeIcon className="size-14" />,
		externalHref: CHROME_EXTENSION_URL,
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
		icon: <img src="/onboarding/x.png" alt="X" className="size-10" />,
	},
]

export function DetailWrapper({
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

const CARD_GROUPS: Array<{ label: string; ids: CardId[] }> = [
	{ label: "AI tools", ids: ["plugins", "mcp"] },
	{
		label: "Apps & extensions",
		ids: ["connections", "chrome", "shortcuts", "raycast", "import"],
	},
]

export function IntegrationsView() {
	const { setViewMode } = useViewMode()
	const [, setAddDoc] = useQueryState("add", addDocumentParam)
	const { org } = useAuth()
	const autumn = useCustomer()
	const hasProProduct = hasActivePlan(autumn.data?.subscriptions, "api_pro")

	const { data: connections = [] } = useQuery({
		queryKey: ["connections"],
		queryFn: async () => {
			const response = await $fetch("@post/connections/list", {
				body: { containerTags: [] },
			})
			if (response.error)
				throw new Error(response.error?.message || "Failed to load connections")
			return response.data as Connection[]
		},
		staleTime: 30 * 1000,
		enabled: hasProProduct,
	})

	const { data: facetsData } = useQuery({
		queryKey: ["document-facets", []],
		queryFn: async () => {
			const response = await $fetch("@post/documents/documents/facets", {
				body: { containerTags: [] },
				disableValidation: true,
			})
			if (response.error)
				throw new Error(response.error?.message || "Failed to fetch facets")
			return response.data as {
				facets: Array<{ category: string; count: number }>
				total: number
			}
		},
		staleTime: 5 * 60 * 1000,
	})

	type ApiKey = { metadata: Record<string, unknown> | null }
	const { data: apiKeys = [] } = useQuery({
		queryKey: ["api-keys", org?.id],
		queryFn: async () => {
			if (!org?.id) return []
			const data = (await authClient.apiKey.list({
				fetchOptions: { query: { metadata: { organizationId: org.id } } },
			})) as unknown as ApiKey[]
			return data.filter((key) => key.metadata?.organizationId === org.id)
		},
		enabled: !!org?.id,
		staleTime: 30 * 1000,
	})

	const connectedPluginCount = apiKeys.filter(
		(key) => key.metadata?.sm_type === "plugin_auth",
	).length

	const tweetCount =
		facetsData?.facets.find((f) => f.category === "tweet")?.count ?? 0

	const getStatusLabel = (
		id: CardId,
	): { label: string; variant: "connected" | "neutral" } | undefined => {
		if (id === "connections" && hasProProduct) {
			return connections.length > 0
				? { label: `${connections.length} connected`, variant: "connected" }
				: { label: "Not connected", variant: "neutral" }
		}
		if (id === "import") {
			return tweetCount > 0
				? { label: `${tweetCount} tweets imported`, variant: "connected" }
				: undefined
		}
		if (id === "plugins") {
			return connectedPluginCount > 0
				? { label: `${connectedPluginCount} connected`, variant: "connected" }
				: undefined
		}
		return undefined
	}

	return (
		<div className="flex-1 p-4 md:p-6 pt-2">
			<div className="max-w-3xl mx-auto">
				<div className="mb-6 space-y-1">
					<div className="flex items-center gap-2">
						<Sun className="size-5 text-white" />
						<h2 className="text-white text-xl font-medium">Integrations</h2>
					</div>
					<p className={cn("text-[#8B8B8B] text-sm", dmSansClassName())}>
						Connect supermemory to your tools and workflows
					</p>
				</div>

				<div className="space-y-6">
					{CARD_GROUPS.map((group) => {
						const groupCards = cards.filter((c) => group.ids.includes(c.id))
						return (
							<div key={group.label}>
								<div className="flex items-center gap-3 mb-3">
									<span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#3A4455] shrink-0">
										{group.label}
									</span>
									<div className="flex-1 h-px bg-[#0F1621]" />
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{groupCards.map((card) => {
										const status = getStatusLabel(card.id)
										return (
											<IntegrationGridCard
												key={card.id}
												title={card.title}
												description={card.description}
												icon={card.icon}
												pro={card.pro}
												statusLabel={status?.label}
												statusVariant={status?.variant}
												isExternal={!!card.externalHref}
												onClick={() => {
													if (card.externalHref) {
														window.open(
															card.externalHref,
															"_blank",
															"noopener,noreferrer",
														)
														analytics.onboardingChromeExtensionClicked({
															source: "integrations",
														})
													} else if (card.id === "connections") {
														void setAddDoc("connect")
													} else {
														void setViewMode(card.id as ViewParamValue)
													}
												}}
											/>
										)
									})}
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}
