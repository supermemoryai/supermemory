"use client"

import { useState, useEffect, useCallback } from "react"
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
import { useDocumentMutations } from "../../../hooks/use-document-mutations"
import { useCustomer } from "autumn-js/react"
import { useMemoriesUsage } from "@/hooks/use-memories-usage"
import { SpaceSelector } from "../space-selector"

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
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className={cn(
					"w-[80%]! max-w-[1000px]! h-[80%]! max-h-[800px]! border-none bg-[#1B1F24] flex flex-col p-4 gap-3 rounded-[22px]",
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
	defaultTab,
	onClose,
	isOpen,
}: {
	defaultTab?: TabType
	onClose: () => void
	isOpen?: boolean
}) {
	const [activeTab, setActiveTab] = useState<TabType>(defaultTab ?? "note")
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
		memoriesUsed,
		memoriesLimit,
		hasProProduct,
		isLoading: isLoadingMemories,
		usagePercent,
	} = useMemoriesUsage(autumn)

	useEffect(() => {
		setLocalSelectedProject(globalSelectedProject)
	}, [globalSelectedProject])

	useEffect(() => {
		if (defaultTab) {
			setActiveTab(defaultTab)
		}
	}, [defaultTab])

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

	// Button click handler
	const handleButtonClick = () => {
		if (activeTab === "note") {
			handleNoteSubmit(noteContent)
		} else if (activeTab === "link") {
			handleLinkSubmit(linkData)
		} else if (activeTab === "file") {
			if (fileData.file) {
				handleFileSubmit(
					fileData as { file: File; title: string; description: string },
				)
			} else {
				toast.error("Please select a file")
			}
		}
	}

	const isSubmitting =
		noteMutation.isPending || linkMutation.isPending || fileMutation.isPending

	return (
		<div className="h-full flex flex-row text-white space-x-5">
			<div className="w-1/3 flex flex-col justify-between">
				<div className="flex flex-col gap-1">
					{tabs.map((tab) => (
						<TabButton
							key={tab.id}
							active={activeTab === tab.id}
							onClick={() => setActiveTab(tab.id)}
							icon={tab.icon}
							title={tab.title}
							description={tab.description}
							isPro={tab.isPro}
						/>
					))}
				</div>

				<div
					data-testid="memories-counter"
					className="bg-[#1B1F24] rounded-2xl p-4 mr-4"
					style={{
						boxShadow:
							"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
					}}
				>
					<div className="flex justify-between items-center">
						<span
							className={cn(
								"text-white text-[16px] font-medium",
								dmSansClassName(),
							)}
						>
							Memories
						</span>
						<span className={cn("text-[#737373] text-sm", dmSansClassName())}>
							{isLoadingMemories
								? "…"
								: hasProProduct
									? "Unlimited"
									: `${memoriesUsed}/${memoriesLimit}`}
						</span>
					</div>
					{!hasProProduct && (
						<div className="h-1.5 bg-[#0D121A] rounded-full overflow-hidden mt-2">
							<div
								className="h-full bg-[#2261CA] rounded-full"
								style={{ width: `${usagePercent}%` }}
							/>
						</div>
					)}
				</div>
			</div>

			<div className="w-2/3 overflow-auto flex flex-col justify-between px-1 scrollbar-thin">
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
				<div className="flex justify-between">
					<SpaceSelector
						value={localSelectedProject}
						onValueChange={setLocalSelectedProject}
						variant="insideOut"
					/>
					<div className="flex items-center gap-2">
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
										<span
											className={cn(
												"bg-[#21212180] border border-[#73737333] text-[#737373] rounded-sm px-1 py-0.5 text-[10px] flex items-center justify-center",
												dmSansClassName(),
											)}
										>
											⌘+Enter
										</span>
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
}: {
	active: boolean
	onClick: () => void
	icon: React.ComponentType<{ className?: string }>
	title: string
	description: string
	isPro?: boolean
}) {
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
