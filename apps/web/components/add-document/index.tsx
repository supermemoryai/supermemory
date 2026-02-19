"use client"

import { useState, useEffect, useCallback } from "react"
import { useQueryState } from "nuqs"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { FileTextIcon, GlobeIcon, ZapIcon, Loader2 } from "lucide-react"
import { Button } from "@ui/components/button"
import { ConnectContent } from "./connections"
import { NoteContent } from "./note"
import { LinkContent, type LinkData } from "./link"
import { FileContent, type FileData } from "./file"
import { useProject } from "@/stores"
import { toast } from "sonner"
import { useDocumentMutations } from "../../hooks/use-document-mutations"
import { useCustomer } from "autumn-js/react"
import { useTokenUsage } from "@/hooks/use-token-usage"
import { tokensToCredits, formatUsageNumber } from "@/lib/billing-utils"
import { SpaceSelector } from "../space-selector"
import { useIsMobile } from "@hooks/use-mobile"
import { addDocumentParam } from "@/lib/search-params"

type TabType = "note" | "link" | "file" | "connect"

interface AddDocumentModalProps {
	isOpen: boolean
	onClose: () => void
	defaultTab?: TabType
}

export function AddDocumentModal({
	isOpen,
	onClose,
	defaultTab,
}: AddDocumentModalProps) {
	const isMobile = useIsMobile()

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className={cn(
					"border-none bg-[#1B1F24] flex flex-col p-3 md:p-4 gap-3",
					isMobile
						? "w-[calc(100vw-1rem)]! h-[calc(100dvh-1rem)]! max-w-none! max-h-none! rounded-xl"
						: "w-[80%]! max-w-[1000px]! h-[80%]! max-h-[800px]! rounded-[22px]",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">Add Document</DialogTitle>
				<div className="flex-1 overflow-hidden">
					<AddDocument
						defaultTab={defaultTab}
						onClose={onClose}
						isOpen={isOpen}
					/>
				</div>
			</DialogContent>
		</Dialog>
	)
}

const tabs = [
	{
		id: "note" as const,
		icon: FileTextIcon,
		title: "Write a note",
		description: "Save your thoughts, notes and summaries, as memories",
	},
	{
		id: "link" as const,
		icon: GlobeIcon,
		title: "Save a link",
		description: "Add any webpage into your searchable knowledge base",
	},
	{
		id: "file" as const,
		icon: FileTextIcon,
		title: "Upload a file",
		description: "Turn any image, PDF or document into contextual memories",
	},
	{
		id: "connect" as const,
		icon: ZapIcon,
		title: "Connect knowledge bases",
		description: "Sync with Google Drive, Notion and OneDrive and import data",
		isPro: true,
	},
]

export function AddDocument({
	onClose,
	isOpen,
}: {
	defaultTab?: TabType
	onClose: () => void
	isOpen?: boolean
}) {
	const isMobile = useIsMobile()
	const [addParam, setAddParam] = useQueryState("add", addDocumentParam)
	const activeTab: TabType = addParam ?? "note"
	const setActiveTab = useCallback(
		(tab: TabType) => {
			setAddParam(tab)
		},
		[setAddParam],
	)
	const { selectedProject: globalSelectedProject } = useProject()
	const [localSelectedProject, setLocalSelectedProject] = useState<string>(
		globalSelectedProject,
	)

	// Form data state for button click handling
	const [noteContent, setNoteContent] = useState("")
	const [linkData, setLinkData] = useState<LinkData>({
		url: "",
		title: "",
		description: "",
	})
	const [fileData, setFileData] = useState<FileData>({
		file: null,
		title: "",
		description: "",
	})

	const { noteMutation, linkMutation, fileMutation } = useDocumentMutations({
		onClose,
	})

	const autumn = useCustomer()
	const {
		tokensUsed,
		tokensLimit,
		tokensPercent,
		searchesUsed,
		searchesLimit,
		searchesPercent,
		hasPaidPlan,
		isLoading: isLoadingUsage,
	} = useTokenUsage(autumn)
	const [isUpgrading, setIsUpgrading] = useState(false)

	useEffect(() => {
		setLocalSelectedProject(globalSelectedProject)
	}, [globalSelectedProject])

	// Submit handlers
	const handleNoteSubmit = useCallback(
		(content: string) => {
			if (!content.trim()) {
				toast.error("Please enter some content")
				return
			}
			noteMutation.mutate({ content, project: localSelectedProject })
		},
		[noteMutation, localSelectedProject],
	)

	const handleLinkSubmit = useCallback(
		(data: LinkData) => {
			if (!data.url.trim()) {
				toast.error("Please enter a URL")
				return
			}
			linkMutation.mutate({ url: data.url, project: localSelectedProject })
		},
		[linkMutation, localSelectedProject],
	)

	const handleFileSubmit = useCallback(
		(data: { file: File; title: string; description: string }) => {
			if (!data.file) {
				toast.error("Please select a file")
				return
			}
			fileMutation.mutate({
				file: data.file,
				title: data.title || undefined,
				description: data.description || undefined,
				project: localSelectedProject,
			})
		},
		[fileMutation, localSelectedProject],
	)

	// Data change handlers
	const handleNoteContentChange = useCallback((content: string) => {
		setNoteContent(content)
	}, [])

	const handleLinkDataChange = useCallback((data: LinkData) => {
		setLinkData(data)
	}, [])

	const handleFileDataChange = useCallback((data: FileData) => {
		setFileData(data)
	}, [])

	const handleButtonClick = () => {
		switch (activeTab) {
			case "note":
				handleNoteSubmit(noteContent)
				break
			case "link":
				handleLinkSubmit(linkData)
				break
			case "file":
				if (fileData.file) {
					handleFileSubmit(
						fileData as { file: File; title: string; description: string },
					)
				} else {
					toast.error("Please select a file")
				}
				break
		}
	}

	const isSubmitting =
		noteMutation.isPending || linkMutation.isPending || fileMutation.isPending

	return (
		<div className="h-full flex flex-col md:flex-row text-white md:space-x-5 space-y-3 md:space-y-0">
			<div
				className={cn(
					"flex flex-col justify-between",
					isMobile ? "w-full" : "w-1/3",
				)}
			>
				<div
					className={cn(
						"flex gap-1",
						isMobile
							? "flex-row overflow-x-auto pb-2 scrollbar-thin"
							: "flex-col",
					)}
				>
					{tabs.map((tab) => (
						<TabButton
							key={tab.id}
							active={activeTab === tab.id}
							onClick={() => setActiveTab(tab.id)}
							icon={tab.icon}
							title={tab.title}
							description={tab.description}
							isPro={tab.isPro}
							compact={isMobile}
						/>
					))}
				</div>

				{!isMobile && (
					<div data-testid="usage-counter" className="flex flex-col gap-3 mr-4">
						<div className="flex flex-col gap-2">
							<div className="flex justify-between items-center">
								<span
									className={cn(
										"text-[#FAFAFA] text-sm font-medium",
										dmSansClassName(),
									)}
								>
									Credits
								</span>
								<span
									className={cn(
										"text-sm font-medium",
										hasPaidPlan ? "text-[#4BA0FA]" : "text-[#737373]",
										dmSansClassName(),
									)}
								>
									{isLoadingUsage
										? "…"
										: `${tokensToCredits(tokensUsed)} / ${tokensToCredits(tokensLimit)}`}
								</span>
							</div>
							<div className="h-2 w-full rounded-[40px] bg-[#2E353D] p-px overflow-hidden">
								<div
									className="h-full rounded-[40px]"
									style={{
										width: `${tokensPercent}%`,
										background:
											tokensPercent > 80
												? "#ef4444"
												: hasPaidPlan
													? "linear-gradient(to right, #4BA0FA 80%, #002757 100%)"
													: "#0054AD",
									}}
								/>
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<div className="flex justify-between items-center">
								<span
									className={cn(
										"text-[#FAFAFA] text-sm font-medium",
										dmSansClassName(),
									)}
								>
									Search Queries
								</span>
								<span
									className={cn(
										"text-sm font-medium",
										hasPaidPlan ? "text-[#4BA0FA]" : "text-[#737373]",
										dmSansClassName(),
									)}
								>
									{isLoadingUsage
										? "…"
										: `${formatUsageNumber(searchesUsed)} / ${formatUsageNumber(searchesLimit)}`}
								</span>
							</div>
							<div className="h-2 w-full rounded-[40px] bg-[#2E353D] p-px overflow-hidden">
								<div
									className="h-full rounded-[40px]"
									style={{
										width: `${searchesPercent}%`,
										background:
											searchesPercent > 80
												? "#ef4444"
												: hasPaidPlan
													? "linear-gradient(to right, #4BA0FA 80%, #002757 100%)"
													: "#0054AD",
									}}
								/>
							</div>
						</div>

						{!hasPaidPlan && (
							<button
								type="button"
								onClick={async () => {
									setIsUpgrading(true)
									try {
										await autumn.attach({
											productId: "api_pro",
											successUrl: "https://app.supermemory.ai/settings#account",
										})
										window.location.reload()
									} catch (error) {
										console.error(error)
										setIsUpgrading(false)
									}
								}}
								disabled={isUpgrading}
								className={cn(
									"relative w-full h-9 rounded-[10px] flex items-center justify-center",
									"text-[#FAFAFA] font-medium text-[13px]",
									"disabled:opacity-60 disabled:cursor-not-allowed",
									"cursor-pointer transition-opacity hover:opacity-90",
									dmSansClassName(),
								)}
								style={{
									background:
										"linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%)",
									boxShadow:
										"1px 1px 2px 0px #1A88FF inset, 0 2px 10px 0 rgba(5, 1, 0, 0.20)",
								}}
							>
								{isUpgrading ? (
									<>
										<Loader2 className="size-3 animate-spin mr-1.5" />
										Upgrading...
									</>
								) : (
									"Upgrade to Pro"
								)}
								<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
							</button>
						)}
					</div>
				)}
			</div>

			<div
				className={cn(
					"flex flex-col flex-1 min-h-0 px-1",
					isMobile ? "w-full" : "w-2/3",
				)}
			>
				<div className="overflow-auto flex-1 min-h-0 scrollbar-thin">
					{activeTab === "note" && (
						<NoteContent
							onSubmit={handleNoteSubmit}
							onContentChange={handleNoteContentChange}
							isSubmitting={noteMutation.isPending}
							isOpen={isOpen}
						/>
					)}
					{activeTab === "link" && (
						<LinkContent
							onSubmit={handleLinkSubmit}
							onDataChange={handleLinkDataChange}
							isSubmitting={linkMutation.isPending}
							isOpen={isOpen}
						/>
					)}
					{activeTab === "file" && (
						<FileContent
							onSubmit={handleFileSubmit}
							onDataChange={handleFileDataChange}
							isSubmitting={fileMutation.isPending}
							isOpen={isOpen}
						/>
					)}
					{activeTab === "connect" && (
						<ConnectContent selectedProject={localSelectedProject} />
					)}
				</div>
				<div
					className={cn(
						"flex gap-2 pt-3 shrink-0",
						isMobile ? "flex-col" : "justify-between",
					)}
				>
					{!isMobile && (
						<SpaceSelector
							selectedProjects={[localSelectedProject]}
							onValueChange={(projects) =>
								setLocalSelectedProject(projects[0] ?? localSelectedProject)
							}
							variant="insideOut"
							singleSelect
						/>
					)}
					<div
						className={cn("flex items-center gap-2", isMobile && "justify-end")}
					>
						<Button
							variant="ghost"
							onClick={onClose}
							disabled={isSubmitting}
							className="text-[#737373] cursor-pointer rounded-full"
						>
							Cancel
						</Button>
						{activeTab !== "connect" && (
							<Button
								variant="insideOut"
								onClick={handleButtonClick}
								disabled={isSubmitting}
							>
								{isSubmitting ? (
									<>
										<Loader2 className="size-4 animate-spin mr-2" />
										Adding...
									</>
								) : (
									<>
										+ Add {activeTab}{" "}
										{!isMobile && (
											<span
												className={cn(
													"bg-[#21212180] border border-[#73737333] text-[#737373] rounded-sm px-1 py-0.5 text-[10px] flex items-center justify-center",
													dmSansClassName(),
												)}
											>
												⌘+Enter
											</span>
										)}
									</>
								)}
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

function TabButton({
	active,
	onClick,
	icon: Icon,
	title,
	description,
	isPro,
	compact,
}: {
	active: boolean
	onClick: () => void
	icon: React.ComponentType<{ className?: string }>
	title: string
	description: string
	isPro?: boolean
	compact?: boolean
}) {
	if (compact) {
		return (
			<button
				type="button"
				onClick={onClick}
				className={cn(
					"flex items-center gap-2 px-3 py-2 rounded-full text-left transition-colors whitespace-nowrap focus:outline-none focus:ring-0 shrink-0",
					active ? "bg-[#14161A] shadow-inside-out" : "hover:bg-[#14161A]/50",
					dmSansClassName(),
				)}
			>
				<Icon className={cn("size-4 shrink-0 text-white")} />
				<span
					className={cn("font-medium text-white text-sm", dmSansClassName())}
				>
					{title.split(" ")[0]}
				</span>
				{isPro && (
					<span className="bg-[#4BA0FA] text-black text-[8px] font-semibold px-1 py-0.5 rounded">
						PRO
					</span>
				)}
			</button>
		)
	}

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-start gap-3 p-4 rounded-[16px] text-left transition-colors w-full focus:outline-none focus:ring-0",
				active
					? "bg-[#14161A] shadow-inside-out"
					: "hover:bg-[#14161A]/50 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]",
				dmSansClassName(),
			)}
		>
			<Icon className={cn("size-5 mt-0.5 shrink-0 text-white")} />
			<div className="flex flex-col gap-0.5 text-[16px]">
				<div className="flex items-center justify-between gap-2">
					<span className={cn("font-medium text-white", dmSansClassName())}>
						{title}
					</span>
					{isPro && (
						<span className="bg-[#4BA0FA] text-black text-[10px] font-semibold px-1.5 py-0.5 rounded">
							PRO
						</span>
					)}
				</div>
				<span className="text-[#737373]">{description}</span>
			</div>
		</button>
	)
}
