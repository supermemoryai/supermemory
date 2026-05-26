"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useQueryState } from "nuqs"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog"
import { Drawer, DrawerContent, DrawerTitle } from "@repo/ui/components/drawer"
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
import { formatUsageNumber } from "@/lib/billing-utils"
import { SpaceSelector } from "../space-selector"
import { useIsMobile } from "@hooks/use-mobile"
import { addDocumentParam } from "@/lib/search-params"

type TabType = "note" | "link" | "file" | "connect"

interface AddDocumentModalProps {
	isOpen: boolean
	onClose: () => void
}

export function AddDocumentModal({ isOpen, onClose }: AddDocumentModalProps) {
	const isMobile = useIsMobile()

	if (isMobile) {
		return (
			<Drawer
				open={isOpen}
				onOpenChange={(open: boolean) => !open && onClose()}
				shouldScaleBackground
			>
				<DrawerContent
					className={cn(
						"flex flex-col gap-0 border-none bg-[#1B1F24] p-0",
						"h-[85svh] max-h-[85svh] overflow-hidden",
						"[&>div:first-child]:bg-[#3A4252] [&>div:first-child]:h-1 [&>div:first-child]:w-9 [&>div:first-child]:mt-2.5 [&>div:first-child]:mb-1",
						dmSansClassName(),
					)}
				>
					<DrawerTitle className="sr-only">Add Document</DrawerTitle>
					<div className="min-h-0 flex-1 overflow-hidden">
						<AddDocument onClose={onClose} isOpen={isOpen} />
					</div>
				</DrawerContent>
			</Drawer>
		)
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
			<DialogContent
				className={cn(
					"border-none bg-[#1B1F24] flex flex-col",
					"w-[80%]! max-w-[1000px]! h-[80%]! max-h-[800px]! rounded-[22px] p-4 gap-3",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">Add Document</DialogTitle>
				<div className="min-h-0 flex-1 overflow-hidden">
					<AddDocument onClose={onClose} isOpen={isOpen} />
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
		compactLabel: "Note",
		description: "Save your thoughts, notes and summaries, as memories",
	},
	{
		id: "link" as const,
		icon: GlobeIcon,
		title: "Save a link",
		compactLabel: "Links",
		description: "Add any webpage into your searchable knowledge base",
	},
	{
		id: "file" as const,
		icon: FileTextIcon,
		title: "Upload files",
		compactLabel: "Files",
		description: "Turn images, PDFs, documents, and markdown into memories",
	},
	{
		id: "connect" as const,
		icon: ZapIcon,
		title: "Connect knowledge bases",
		compactLabel: "Connect",
		description: "Sync with Google Drive, Notion and OneDrive and import data",
		isPro: true,
	},
]

export function AddDocument({
	onClose,
	isOpen,
}: {
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
		items: [],
		title: "",
		description: "",
	})
	const fileDataRef = useRef(fileData)
	fileDataRef.current = fileData

	const { noteMutation, linkMutation, fileMutation } = useDocumentMutations({
		onClose,
	})

	const autumn = useCustomer()
	const {
		tokensUsed,
		searchesUsed,
		planUsagePct,
		hasPaidPlan,
		isLoading: isLoadingUsage,
	} = useTokenUsage(autumn)
	const [isUpgrading, setIsUpgrading] = useState(false)

	useEffect(() => {
		setLocalSelectedProject(globalSelectedProject)
	}, [globalSelectedProject])

	useEffect(() => {
		if (!isOpen) {
			setFileData({ items: [], title: "", description: "" })
			setNoteContent("")
			setLinkData({ url: "", title: "", description: "" })
		}
	}, [isOpen])

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
		async (data: FileData) => {
			const pending = data.items.filter((i) => i.status === "pending")
			if (pending.length === 0) {
				toast.error("Please add at least one file")
				return
			}
			const applyMeta = pending.length === 1
			setFileData((prev) => ({
				...prev,
				items: prev.items.map((i) =>
					i.status === "pending" ? { ...i, status: "uploading" as const } : i,
				),
			}))
			try {
				const result = await fileMutation.mutateAsync({
					fileEntries: pending.map((i) => ({ id: i.id, file: i.file })),
					title: applyMeta ? data.title || undefined : undefined,
					description: applyMeta ? data.description || undefined : undefined,
					project: localSelectedProject,
				})
				setFileData((prev) => ({
					...prev,
					items: prev.items.map((i) => {
						if (i.status !== "uploading") return i
						const fail = result.failures.find((f) => f.id === i.id)
						if (fail) {
							return {
								...i,
								status: "error" as const,
								errorMessage: fail.message,
							}
						}
						return { ...i, status: "success" as const }
					}),
				}))
			} catch {
				setFileData((prev) => ({
					...prev,
					items: prev.items.map((i) =>
						i.status === "uploading"
							? {
									...i,
									status: "error" as const,
									errorMessage: "Upload failed",
								}
							: i,
					),
				}))
			}
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
				void handleFileSubmit(fileData)
				break
		}
	}

	const isSubmitting =
		noteMutation.isPending || linkMutation.isPending || fileMutation.isPending

	const fileTabHasPending = fileData.items.some((i) => i.status === "pending")
	const fileTabSubmitDisabled =
		activeTab === "file" && (!fileTabHasPending || isSubmitting)

	const spaceSelector = (
		<SpaceSelector
			selectedProjects={[localSelectedProject]}
			onValueChange={(projects) =>
				setLocalSelectedProject(projects[0] ?? localSelectedProject)
			}
			variant="insideOut"
			compact={isMobile}
			triggerClassName={cn(isMobile && "h-12 shrink-0")}
		/>
	)

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden text-white md:flex-row md:space-x-5">
			{isMobile && !hasPaidPlan && (
				<div className="flex shrink-0 justify-end px-4 pb-2">
					<button
						type="button"
						onClick={async () => {
							setIsUpgrading(true)
							try {
								const result = await autumn.attach({
									planId: "api_pro",
									successUrl: `${window.location.origin}/settings#account`,
								})
								if (result?.paymentUrl) {
									window.open(result.paymentUrl, "_self")
									return
								}
								autumn.refetch?.()
							} catch (error) {
								console.error(error)
								toast.error("Failed to start checkout. Please try again.")
							} finally {
								setIsUpgrading(false)
							}
						}}
						disabled={isUpgrading}
						className={cn(
							"shrink-0 cursor-pointer rounded-full bg-[#0054AD]/30 px-2.5 py-1 text-[11px] font-medium text-[#4BA0FA] transition-colors hover:bg-[#0054AD]/50 disabled:opacity-60",
							dmSansClassName(),
						)}
					>
						{isUpgrading ? "Upgrading…" : "Upgrade"}
					</button>
				</div>
			)}
			{!isMobile && (
				<div className="flex w-1/3 flex-col justify-between">
					<div className="flex flex-col gap-1">
						{tabs.map((tab) => (
							<TabButton
								key={tab.id}
								active={activeTab === tab.id}
								onClick={() => setActiveTab(tab.id)}
								icon={tab.icon}
								title={tab.title}
								compactLabel={tab.compactLabel}
								description={tab.description}
								isPro={tab.isPro}
							/>
						))}
					</div>

					<div data-testid="usage-counter" className="flex flex-col gap-3 mr-4">
						<div className="flex flex-col gap-2">
							<div className="flex justify-between items-center">
								<span
									className={cn(
										"text-[#FAFAFA] text-sm font-medium",
										dmSansClassName(),
									)}
								>
									Plan usage
								</span>
								<span
									className={cn(
										"text-sm font-medium tabular-nums",
										hasPaidPlan ? "text-[#4BA0FA]" : "text-[#737373]",
										dmSansClassName(),
									)}
								>
									{isLoadingUsage
										? "…"
										: `${planUsagePct < 1 && planUsagePct > 0 ? "< 1" : Math.round(planUsagePct)}% used`}
								</span>
							</div>
							<div className="h-2 w-full rounded-[40px] bg-[#2E353D] p-px overflow-hidden">
								<div
									className="h-full rounded-[40px]"
									style={{
										width: `${planUsagePct}%`,
										background:
											planUsagePct > 80
												? "#ef4444"
												: hasPaidPlan
													? "linear-gradient(to right, #4BA0FA 80%, #002757 100%)"
													: "#0054AD",
									}}
									title={`${formatUsageNumber(tokensUsed)} tokens · ${formatUsageNumber(searchesUsed)} queries`}
								/>
							</div>
							{!isLoadingUsage && (
								<p
									className={cn(
										"text-xs text-[#737373] tabular-nums",
										dmSansClassName(),
									)}
								>
									{formatUsageNumber(tokensUsed)} tokens ·{" "}
									{formatUsageNumber(searchesUsed)} queries
								</p>
							)}
						</div>

						{!hasPaidPlan && (
							<button
								type="button"
								onClick={async () => {
									setIsUpgrading(true)
									try {
										const result = await autumn.attach({
											planId: "api_pro",
											successUrl: `${window.location.origin}/settings#account`,
										})
										if (result?.paymentUrl) {
											window.open(result.paymentUrl, "_self")
											return
										}
										autumn.refetch?.()
									} catch (error) {
										console.error(error)
										toast.error("Failed to start checkout. Please try again.")
									} finally {
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
										Upgrading…
									</>
								) : (
									"Upgrade to Pro"
								)}
								<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
							</button>
						)}
					</div>
				</div>
			)}

			<div
				className={cn(
					"flex min-h-0 flex-1 flex-col",
					isMobile ? "w-full px-4 pt-1" : "w-2/3 px-1",
				)}
			>
				{isMobile && (
					<div className="mb-3 flex h-10 w-full shrink-0 items-center overflow-hidden rounded-full border border-[#1F2937] bg-[#0D121A] p-1">
						{tabs.map((tab) => (
							<TabButton
								key={tab.id}
								active={activeTab === tab.id}
								onClick={() => setActiveTab(tab.id)}
								icon={tab.icon}
								title={tab.title}
								compactLabel={tab.compactLabel}
								description={tab.description}
								isPro={tab.isPro}
								compact
							/>
						))}
					</div>
				)}
				<div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
					{activeTab === "note" && (
						<NoteContent
							onSubmit={handleNoteSubmit}
							onContentChange={handleNoteContentChange}
							isSubmitting={noteMutation.isPending}
							isOpen={isOpen}
							initialContent={noteContent}
						/>
					)}
					{activeTab === "link" && (
						<LinkContent
							onSubmit={handleLinkSubmit}
							onDataChange={handleLinkDataChange}
							isSubmitting={linkMutation.isPending}
							isOpen={isOpen}
							initialData={linkData}
						/>
					)}
					{activeTab === "file" && (
						<FileContent
							data={fileData}
							onDataChange={handleFileDataChange}
							onRequestSubmit={() => {
								void handleFileSubmit(fileDataRef.current)
							}}
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
						"flex shrink-0",
						isMobile
							? "mx-[-1rem] mt-3 flex-col gap-3 border-t border-[#0F1621] bg-[#1B1F24] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
							: "justify-between gap-2 pt-3",
					)}
				>
					{!isMobile && spaceSelector}
					<div
						className={cn(
							"flex items-center gap-2",
							isMobile ? "w-full" : "justify-end",
						)}
					>
						{isMobile && spaceSelector}
						{!isMobile && (
							<Button
								variant="ghost"
								onClick={onClose}
								disabled={isSubmitting}
								className="cursor-pointer rounded-full text-[#737373]"
							>
								Cancel
							</Button>
						)}
						{activeTab !== "connect" && (
							<Button
								variant="insideOut"
								onClick={handleButtonClick}
								disabled={
									activeTab === "file" ? fileTabSubmitDisabled : isSubmitting
								}
								className={cn(isMobile && "h-12 flex-1 px-5 text-[15px]")}
							>
								{isSubmitting ? (
									<>
										<Loader2 className="size-4 animate-spin mr-2" />
										Adding…
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
	compactLabel,
	description,
	isPro,
	compact,
}: {
	active: boolean
	onClick: () => void
	icon: React.ComponentType<{ className?: string }>
	title: string
	compactLabel?: string
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
					"relative flex h-full min-w-0 flex-1 basis-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-1 text-center transition-colors focus:outline-none focus:ring-0",
					active
						? "border-[#2261CA33] bg-[#00173C] text-white"
						: "text-[#8B8B8B] hover:bg-white/5",
					dmSansClassName(),
				)}
			>
				<span
					className={cn(
						"min-w-0 truncate text-[13px] font-medium",
						dmSansClassName(),
					)}
				>
					{compactLabel ?? title.split(" ")[0]}
				</span>
				{isPro && (
					<span
						role="img"
						aria-label="Pro"
						className="size-1.5 shrink-0 rounded-full bg-[#4BA0FA]"
					/>
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
