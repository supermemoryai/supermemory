import { useState } from "react"
import { cn } from "@lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@ui/components/tabs"
import { MemoryGraph } from "../memory-graph"
import { useProject } from "@/stores"

export interface MemoryEntry {
	id: string
	memory: string
	title?: string
	url?: string
	version: number
	isForgotten: boolean
	forgetAfter: string | null
	isLatest: boolean
	isStatic: boolean
}

function VersionStatus({
	status,
}: {
	status: "latest" | "static" | "expiring" | "forgotten"
}) {
	return (
		<>
			{
				{
					latest: (
						<div className="text-[#05A376] text-[10px] font-medium flex items-center gap-1">
							<svg
								width="10"
								height="10"
								viewBox="0 0 10 10"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<title>Latest</title>
								<g opacity="0.6">
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M5 0L9.33 2.5V7.5L5 10L0.67 7.5V2.5L5 0ZM7.5 2.5H5H2.5L2.5 7.5H7.5V5V2.5Z"
										fill="#00FFA9"
									/>
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M5 2.5H2.5L2.5 7.5H7.5V5C6.12 5 5 3.88 5 2.5Z"
										fill="#005236"
									/>
									<path
										d="M7.5 2.5H5C5 3.88 6.12 5 7.5 5V2.5Z"
										fill="#00FFA9"
									/>
									<path
										d="M9.08 2.64V7.35L5 9.71L0.92 7.35V2.64L5 0.29L9.08 2.64ZM2.25 2.25V7.75H7.75V2.25H2.25ZM4.76 2.75C4.88 4.07 5.93 5.12 7.25 5.24V7.25H2.75V2.75H4.76ZM7.25 2.75V4.73C6.21 4.62 5.38 3.79 5.27 2.75H7.25Z"
										stroke="#00FFA9"
										strokeWidth="0.5"
									/>
								</g>
							</svg>
							Latest
						</div>
					),
					static: (
						<div className="text-[#369BFD] text-[10px] font-medium flex items-center gap-1">
							<svg
								width="10"
								height="10"
								viewBox="0 0 10 10"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<title>Static</title>
								<circle cx="5" cy="5" r="1.25" fill="#369BFD" />
								<circle
									cx="5"
									cy="5"
									r="0.83"
									stroke="#369BFD"
									strokeOpacity="0.5"
									strokeWidth="0.833333"
								/>
								<circle
									cx="5"
									cy="5"
									r="2.92"
									stroke="#369BFD"
									strokeOpacity="0.5"
									strokeWidth="0.833333"
								/>
								<circle
									cx="5"
									cy="5"
									r="4.58"
									stroke="#369BFD"
									strokeOpacity="0.2"
									strokeWidth="0.833333"
								/>
							</svg>
							Static
						</div>
					),
					expiring: (
						<div className="text-[#9D6510] text-[10px] font-medium">
							<svg
								width="10"
								height="10"
								viewBox="0 0 10 10"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<title>Expiring</title>
								<g opacity="0.6">
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M2.5 2.5H7.5V7.5H2.5L2.5 2.5Z"
										fill="#4D2E00"
									/>
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M5 0L9.33 2.5V7.5L5 10L0.67 7.5V2.5L5 0ZM7.5 2.5H2.5L2.5 7.5H7.5V2.5Z"
										fill="#FE9900"
									/>
									<path
										d="M9.08 2.64V7.35L5 9.71L0.92 7.35V2.64L5 0.29L9.08 2.64ZM2.25 2.25V7.75H7.75V2.25H2.25ZM7.25 2.75V7.25H2.75V2.75H7.25Z"
										stroke="#FE9900"
										strokeWidth="0.5"
									/>
								</g>
							</svg>
							Expiring
						</div>
					),
					forgotten: (
						<div className="text-[#9C4044] text-[10px] font-medium">
							<svg
								width="10"
								height="10"
								viewBox="0 0 10 10"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<title>Forgotten</title>
								<path
									opacity="0.6"
									d="M9.08 2.64V7.35L5 9.71L0.92 7.35V2.64L5 0.29L9.08 2.64Z"
									fill="#60272C"
									stroke="#FF6467"
									strokeWidth="0.5"
								/>
								<path
									d="M2.08 2.08L7.92 7.92M7.92 2.08L2.08 7.92"
									stroke="#9C4044"
									strokeWidth="0.5"
								/>
							</svg>
							Forgotten
						</div>
					),
				}[status]
			}
		</>
	)
}

export function GraphListMemories({
	memoryEntries,
	documentId,
}: {
	memoryEntries: MemoryEntry[]
	documentId?: string
}) {
	const { effectiveContainerTags } = useProject()
	const [expandedMemories, setExpandedMemories] = useState<Set<string>>(
		new Set(),
	)

	const toggleMemory = (memoryId: string) => {
		setExpandedMemories((prev) => {
			const next = new Set(prev)
			if (next.has(memoryId)) {
				next.delete(memoryId)
			} else {
				next.add(memoryId)
			}
			return next
		})
	}

	return (
		<div
			id="document-memories"
			className="relative flex-1 px-3 pt-3 rounded-[14px] flex flex-col overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]"
			style={{
				backgroundImage: "url('/dot-pattern.svg')",
				backgroundRepeat: "repeat",
				backgroundSize: "369px 371px",
			}}
		>
			<Tabs defaultValue="list" className="flex flex-col flex-1 min-h-0">
				<TabsList className="rounded-full border border-[#161F2C] h-11! z-10!">
					<TabsTrigger
						value="graph"
						className={cn(
							"group rounded-full data-[state=active]:bg-[#00173C]! dark:data-[state=active]:border-[#2261CA33]! px-4 py-4",
						)}
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 14 14"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<title>Graph</title>
							<mask
								id="mask0_891_45456"
								maskUnits="userSpaceOnUse"
								x="0"
								y="0"
								width="14"
								height="14"
							>
								<rect width="14" height="14" fill="#D9D9D9" />
							</mask>
							<g mask="url(#mask0_891_45456)">
								<path
									d="M7 12.83C6.51 12.83 6.1 12.66 5.76 12.32C5.42 11.98 5.25 11.57 5.25 11.08C5.25 11.03 5.25 10.98 5.26 10.92C5.26 10.86 5.27 10.81 5.28 10.76L4.07 10.08C3.91 10.21 3.74 10.32 3.54 10.39C3.35 10.46 3.14 10.5 2.92 10.5C2.43 10.5 2.02 10.33 1.68 9.99C1.34 9.65 1.17 9.24 1.17 8.75C1.17 8.26 1.34 7.85 1.68 7.51C2.02 7.17 2.43 7 2.92 7C3.15 7 3.37 7.04 3.57 7.13C3.78 7.22 3.96 7.34 4.13 7.5L5.86 6.62C5.83 6.4 5.85 6.18 5.9 5.96C5.95 5.75 6.05 5.55 6.18 5.37L5.69 4.61C5.62 4.63 5.55 4.64 5.48 4.65C5.4 4.66 5.33 4.67 5.25 4.67C4.76 4.67 4.35 4.5 4.01 4.16C3.67 3.82 3.5 3.4 3.5 2.92C3.5 2.43 3.67 2.02 4.01 1.68C4.35 1.34 4.76 1.17 5.25 1.17C5.74 1.17 6.15 1.34 6.49 1.68C6.83 2.02 7 2.43 7 2.92C7 3.11 6.97 3.3 6.91 3.48C6.84 3.66 6.76 3.82 6.65 3.97L7.16 4.73C7.24 4.71 7.31 4.69 7.38 4.68C7.45 4.67 7.52 4.67 7.6 4.67C7.76 4.67 7.92 4.69 8.07 4.73C8.21 4.76 8.35 4.82 8.49 4.9L9.45 4.11C9.41 4.02 9.38 3.92 9.36 3.81C9.34 3.71 9.33 3.61 9.33 3.5C9.33 3.01 9.5 2.6 9.84 2.26C10.18 1.92 10.6 1.75 11.08 1.75C11.57 1.75 11.98 1.92 12.32 2.26C12.66 2.6 12.83 3.01 12.83 3.5C12.83 3.99 12.66 4.4 12.32 4.74C11.98 5.08 11.57 5.25 11.08 5.25C10.92 5.25 10.76 5.23 10.62 5.18C10.47 5.14 10.33 5.08 10.19 5L9.23 5.8C9.27 5.9 9.3 6 9.32 6.1C9.34 6.21 9.35 6.31 9.35 6.42C9.35 6.9 9.18 7.32 8.84 7.66C8.5 8 8.08 8.17 7.6 8.17C7.37 8.17 7.14 8.12 6.93 8.04C6.73 7.95 6.54 7.83 6.37 7.67L4.65 8.53C4.67 8.62 4.68 8.71 4.67 8.79C4.67 8.88 4.66 8.97 4.64 9.06L5.86 9.76C6.02 9.62 6.19 9.52 6.38 9.44C6.57 9.37 6.78 9.33 7 9.33C7.49 9.33 7.9 9.5 8.24 9.84C8.58 10.18 8.75 10.6 8.75 11.08C8.75 11.57 8.58 11.98 8.24 12.32C7.9 12.66 7.49 12.83 7 12.83ZM2.92 9.33C3.08 9.33 3.22 9.28 3.33 9.17C3.44 9.05 3.5 8.92 3.5 8.75C3.5 8.58 3.44 8.45 3.33 8.33C3.22 8.22 3.08 8.17 2.92 8.17C2.75 8.17 2.61 8.22 2.5 8.33C2.39 8.45 2.33 8.58 2.33 8.75C2.33 8.92 2.39 9.05 2.5 9.17C2.61 9.28 2.75 9.33 2.92 9.33ZM5.25 3.5C5.42 3.5 5.55 3.44 5.67 3.33C5.78 3.22 5.83 3.08 5.83 2.92C5.83 2.75 5.78 2.61 5.67 2.5C5.55 2.39 5.42 2.33 5.25 2.33C5.09 2.33 4.95 2.39 4.83 2.5C4.72 2.61 4.67 2.75 4.67 2.92C4.67 3.08 4.72 3.22 4.83 3.33C4.95 3.44 5.09 3.5 5.25 3.5ZM7 11.67C7.17 11.67 7.3 11.61 7.42 11.5C7.53 11.39 7.58 11.25 7.58 11.08C7.58 10.92 7.53 10.78 7.42 10.67C7.3 10.56 7.17 10.5 7 10.5C6.84 10.5 6.7 10.56 6.58 10.67C6.47 10.78 6.42 10.92 6.42 11.08C6.42 11.25 6.47 11.39 6.58 11.5C6.7 11.61 6.84 11.67 7 11.67ZM7.58 7C7.75 7 7.89 6.94 8 6.83C8.11 6.72 8.17 6.58 8.17 6.42C8.17 6.25 8.11 6.11 8 6C7.89 5.89 7.75 5.83 7.58 5.83C7.42 5.83 7.28 5.89 7.17 6C7.06 6.11 7 6.25 7 6.42C7 6.58 7.06 6.72 7.17 6.83C7.28 6.94 7.42 7 7.58 7ZM11.08 4.08C11.25 4.08 11.39 4.03 11.5 3.92C11.61 3.8 11.67 3.67 11.67 3.5C11.67 3.33 11.61 3.2 11.5 3.08C11.39 2.97 11.25 2.92 11.08 2.92C10.92 2.92 10.78 2.97 10.67 3.08C10.56 3.2 10.5 3.33 10.5 3.5C10.5 3.67 10.56 3.8 10.67 3.92C10.78 4.03 10.92 4.08 11.08 4.08Z"
									className="fill-[#737373] group-hover:fill-white group-data-[state=active]:fill-white"
								/>
							</g>
						</svg>
						<p className="group-hover:text-white group-data-[state=active]:text-white">
							Graph
						</p>
					</TabsTrigger>
					<TabsTrigger
						value="list"
						className={cn(
							"group rounded-full dark:data-[state=active]:bg-[#00173C]! dark:data-[state=active]:border-[#2261CA33]! px-6 py-[7px] align-middle items-center",
						)}
					>
						<svg
							width="10"
							height="12"
							viewBox="0 0 10 12"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							className="w-3.5! h-3.5!"
						>
							<title>List</title>
							<path
								d="M0 1.78H0C0 1.86 0.04 1.95 0.1 2C0.15 2.06 0.23 2.1 0.32 2.1L8.77 2.1C8.85 2.1 8.93 2.06 8.99 2.01C9.05 1.95 9.08 1.87 9.08 1.78H9.09V0.32C9.09 0.23 9.05 0.15 8.99 0.09C8.93 0.03 8.85 3.69e-05 8.77 0H0.32C0.23 3.71e-05 0.15 0.03 0.09 0.09C0.03 0.15 3.71e-05 0.23 0 0.32C0 0.32 0 0.33 0 0.33L0 1.78ZM8.77 4.49H0.32C0.23 4.49 0.15 4.53 0.09 4.59C0.03 4.65 3.71e-05 4.73 0 4.81C0 4.82 0 4.82 0 4.83V6.27H0C0 6.36 0.04 6.44 0.1 6.5C0.15 6.56 0.23 6.59 0.32 6.59L8.77 6.59C8.85 6.59 8.93 6.56 8.99 6.5C9.05 6.44 9.08 6.36 9.08 6.27H9.09V4.81C9.09 4.73 9.05 4.65 8.99 4.59C8.93 4.53 8.85 4.49 8.77 4.49ZM8.77 8.99H0.32C0.23 8.99 0.15 9.02 0.09 9.08C0.03 9.14 3.71e-05 9.22 0 9.3C0 9.31 0 9.31 0 9.32V10.77H0C0 10.85 0.04 10.93 0.1 10.99C0.15 11.05 0.23 11.08 0.32 11.08L8.77 11.09C8.85 11.08 8.93 11.05 8.99 10.99C9.05 10.93 9.08 10.85 9.08 10.77H9.09V9.3C9.09 9.22 9.05 9.14 8.99 9.08C8.93 9.02 8.85 8.99 8.77 8.99Z"
								className="fill-[#737373] group-hover:fill-white group-data-[state=active]:fill-white"
							/>
						</svg>
						<p className="group-hover:text-white group-data-[state=active]:text-white">
							List
						</p>
					</TabsTrigger>
				</TabsList>
				<TabsContent value="graph" className="flex-1 min-h-0 mt-3">
					<div className="size-full rounded-lg overflow-hidden">
						<MemoryGraph
							containerTags={effectiveContainerTags}
							documentIds={documentId ? [documentId] : undefined}
							highlightDocumentIds={documentId ? [documentId] : undefined}
							highlightsVisible
							variant="consumer"
							maxNodes={50}
						/>
					</div>
				</TabsContent>
				<TabsContent
					value="list"
					className="flex-1 min-h-0 overflow-hidden mt-0"
				>
					<div className="grid grid-cols-2 gap-2 pt-3 overflow-y-auto pr-1 scrollbar-thin items-start h-full">
						{memoryEntries.map((memory, idx) => {
							const isClickable =
								memory.url &&
								(memory.url.startsWith("http://") ||
									memory.url.startsWith("https://"))

							const status = memory.isForgotten
								? "forgotten"
								: memory.forgetAfter
									? "expiring"
									: memory.isStatic
										? "static"
										: "latest"

							const content = (
								<div className="">
									<div className="bg-[#060D17] p-2 px-[10px] rounded-[10px] m-[2px]">
										{memory.title && (
											<div className="text-xs text-[#525D6E] line-clamp-2">
												{memory.title}
											</div>
										)}
										{memory.memory && (
											<button
												type="button"
												className={cn(
													"text-xs text-[#525D6E] cursor-pointer transition-all text-left w-full",
													expandedMemories.has(memory.id) ? "" : "line-clamp-2",
												)}
												onClick={() => toggleMemory(memory.id)}
											>
												{memory.memory}
											</button>
										)}
										{memory.url && (
											<div className="text-xs text-[#525D6E] truncate">
												{memory.url}
											</div>
										)}
									</div>
									<div className="px-[10px] py-1 flex items-center justify-between">
										<div
											className="text-[10px] inline-block bg-clip-text text-transparent font-medium"
											style={{
												background:
													"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
												backgroundClip: "text",
												WebkitBackgroundClip: "text",
												WebkitTextFillColor: "transparent",
											}}
										>
											v{memory.version}
										</div>
										<VersionStatus status={status} />
									</div>
								</div>
							)

							if (isClickable) {
								return (
									<a
										className="block p-2 bg-[#0C1829]/50 rounded-md border border-[#525D6E]/20 hover:bg-[#0C1829]/70 transition-colors cursor-pointer self-start"
										href={memory.url}
										key={memory.id || idx}
										rel="noopener noreferrer"
										target="_blank"
									>
										{content}
									</a>
								)
							}

							return (
								<div
									className={cn("bg-[#0C1829] rounded-xl self-start")}
									key={memory.id || idx}
								>
									{content}
								</div>
							)
						})}
					</div>
				</TabsContent>
			</Tabs>
		</div>
	)
}
