"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@repo/ui/components/dialog"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"
import {
	FileTextIcon,
	GlobeIcon,
	ZapIcon,
	ChevronsUpDownIcon,
} from "lucide-react"
import { Button } from "@ui/components/button"
import { ConnectContent } from "./connections"
import { NoteContent } from "./note"
import { LinkContent } from "./link"
import { FileContent } from "./file"

interface AddDocumentModalProps {
	isOpen: boolean
	onClose: () => void
}

export function AddDocumentModal({ isOpen, onClose }: AddDocumentModalProps) {
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
				<div className="flex-1 overflow-hidden">
					<AddDocument />
				</div>
			</DialogContent>
		</Dialog>
	)
}

type TabType = "note" | "link" | "file" | "connect"

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

export function AddDocument() {
	const [activeTab, setActiveTab] = useState<TabType>("note")

	return (
		<div className="h-full flex flex-row text-white space-x-6">
			{/* Tabs - 1/3 width */}
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

				{/* Memories counter */}
				<div
					className="bg-[#1B1F24] rounded-2xl p-4 mr-4"
					style={{
						boxShadow:
							"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
					}}
				>
					<div className="flex justify-between items-center mb-2">
						<span
							className={cn(
								"text-white text-[16px] font-medium",
								dmSansClassName(),
							)}
						>
							Memories
						</span>
						<span className={cn("text-[#737373] text-sm", dmSansClassName())}>
							120/200
						</span>
					</div>
					<div className="h-1.5 bg-[#0D121A] rounded-full overflow-hidden">
						<div
							className="h-full bg-[#2261CA] rounded-full"
							style={{ width: "60%" }}
						/>
					</div>
				</div>
			</div>

			{/* Content - 2/3 width */}
			<div className="w-2/3 overflow-auto flex flex-col justify-between">
				{activeTab === "note" && <NoteContent />}
				{activeTab === "link" && <LinkContent />}
				{activeTab === "file" && <FileContent />}
				{activeTab === "connect" && <ConnectContent />}
				<div className="flex justify-between">
					<Button variant="insideOut">
						My Space <ChevronsUpDownIcon className="size-4" color="#737373" />
					</Button>
					<div>
						<Button
							variant="ghost"
							className="text-[#737373] hover:bg-none! cursor-pointer"
						>
							Cancel
						</Button>
						{activeTab !== "connect" && (
							<Button variant="insideOut">
								+ Add {activeTab}{" "}
								<span
									className={cn(
										"bg-[#21212180] border border-[#73737333] text-[#737373] rounded-sm px-1 py-0.5 text-[10px] flex items-center justify-center",
										dmSansClassName(),
									)}
								>
									⌘+Enter
								</span>
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
				"flex items-start gap-3 p-4 rounded-[16px] text-left transition-colors w-full",
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
