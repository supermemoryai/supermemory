import { useState } from "react"
import { cn } from "@lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs"

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
										d="M5.00069 0L9.33082 2.5V7.5L5.00069 10L0.670563 7.5V2.5L5.00069 0ZM7.5008 2.5H5.0008H2.50069L2.5008 7.5H7.5008V5V2.5Z"
										fill="#00FFA9"
									/>
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M5.0008 2.5H2.50069L2.5008 7.5H7.5008V5C6.12009 5 5.0008 3.88071 5.0008 2.5Z"
										fill="#005236"
									/>
									<path
										d="M7.5008 2.5H5.0008C5.0008 3.88071 6.12009 5 7.5008 5V2.5Z"
										fill="#00FFA9"
									/>
									<path
										d="M9.08072 2.64453V7.35449L5.00064 9.71094L0.920563 7.35449V2.64453L5.00064 0.288086L9.08072 2.64453ZM2.25064 2.25V7.75H7.75064V2.25H2.25064ZM4.76334 2.75C4.88226 4.0691 5.93157 5.11728 7.25064 5.23633V7.25H2.75064V2.75H4.76334ZM7.25064 2.75V4.73438C6.20794 4.61894 5.3806 3.79274 5.26529 2.75H7.25064Z"
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
								<circle cx="5.00061" cy="5.00073" r="1.25" fill="#369BFD" />
								<circle
									cx="5.00061"
									cy="5.00073"
									r="0.833333"
									stroke="#369BFD"
									strokeOpacity="0.5"
									strokeWidth="0.833333"
								/>
								<circle
									cx="5.00057"
									cy="5.00081"
									r="2.91667"
									stroke="#369BFD"
									strokeOpacity="0.5"
									strokeWidth="0.833333"
								/>
								<circle
									cx="5"
									cy="5"
									r="4.58333"
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
										d="M2.50066 2.5H7.50077V7.5H2.50077L2.50066 2.5Z"
										fill="#4D2E00"
									/>
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M5.00066 0L9.33078 2.5V7.5L5.00066 10L0.670532 7.5V2.5L5.00066 0ZM7.50077 2.5H2.50066L2.50077 7.5H7.50077V2.5Z"
										fill="#FE9900"
									/>
									<path
										d="M9.08069 2.64453V7.35449L5.00061 9.71094L0.920532 7.35449V2.64453L5.00061 0.288086L9.08069 2.64453ZM2.25061 2.25V7.75H7.75061V2.25H2.25061ZM7.25061 2.75V7.25H2.75061V2.75H7.25061Z"
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
									d="M9.08008 2.64453V7.35449L5 9.71094L0.919922 7.35449V2.64453L5 0.288086L9.08008 2.64453Z"
									fill="#60272C"
									stroke="#FF6467"
									strokeWidth="0.5"
								/>
								<path
									d="M2.08333 2.08341L7.91677 7.91685M7.91667 2.08341L2.08333 7.91675"
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
}: {
	memoryEntries: MemoryEntry[]
}) {
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
			<Tabs defaultValue="list">
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
									d="M7.00057 12.8334C6.51446 12.8334 6.10126 12.6632 5.76099 12.3229C5.42071 11.9827 5.25057 11.5695 5.25057 11.0834C5.25057 11.0347 5.253 10.9813 5.25786 10.9229C5.26272 10.8646 5.27001 10.8111 5.27974 10.7625L4.06932 10.0771C3.91376 10.2132 3.73876 10.3177 3.54432 10.3906C3.34988 10.4636 3.14085 10.5 2.91724 10.5C2.43113 10.5 2.01793 10.3299 1.67765 9.9896C1.33738 9.64933 1.16724 9.23613 1.16724 8.75002C1.16724 8.26391 1.33738 7.85071 1.67765 7.51044C2.01793 7.17016 2.43113 7.00002 2.91724 7.00002C3.15057 7.00002 3.36932 7.04377 3.57349 7.13127C3.77765 7.21877 3.96238 7.3403 4.12765 7.49585L5.86307 6.62085C5.8339 6.39724 5.84606 6.17849 5.89953 5.9646C5.953 5.75071 6.04779 5.55141 6.1839 5.36669L5.68807 4.60835C5.62001 4.6278 5.54953 4.64238 5.47661 4.6521C5.40369 4.66183 5.32835 4.66669 5.25057 4.66669C4.76446 4.66669 4.35126 4.49655 4.01099 4.15627C3.67071 3.81599 3.50057 3.4028 3.50057 2.91669C3.50057 2.43058 3.67071 2.01738 4.01099 1.6771C4.35126 1.33683 4.76446 1.16669 5.25057 1.16669C5.73668 1.16669 6.14988 1.33683 6.49015 1.6771C6.83043 2.01738 7.00057 2.43058 7.00057 2.91669C7.00057 3.11113 6.96897 3.29828 6.90578 3.47815C6.84258 3.65801 6.75751 3.82085 6.65057 3.96669L7.16099 4.72502C7.23876 4.70558 7.31168 4.69099 7.37974 4.68127C7.44779 4.67155 7.52071 4.66669 7.59849 4.66669C7.76376 4.66669 7.91932 4.68613 8.06515 4.72502C8.21099 4.76391 8.35196 4.82224 8.48807 4.90002L9.45057 4.11252C9.41168 4.0153 9.38251 3.91565 9.36307 3.81356C9.34363 3.71148 9.3339 3.60696 9.3339 3.50002C9.3339 3.01391 9.50404 2.60071 9.84432 2.26044C10.1846 1.92016 10.5978 1.75002 11.0839 1.75002C11.57 1.75002 11.9832 1.92016 12.3235 2.26044C12.6638 2.60071 12.8339 3.01391 12.8339 3.50002C12.8339 3.98613 12.6638 4.39933 12.3235 4.7396C11.9832 5.07988 11.57 5.25002 11.0839 5.25002C10.9186 5.25002 10.7631 5.22815 10.6172 5.1844C10.4714 5.14065 10.3304 5.07988 10.1943 5.0021L9.23182 5.80419C9.27071 5.90141 9.29988 6.00106 9.31932 6.10315C9.33876 6.20523 9.34849 6.30974 9.34849 6.41669C9.34849 6.9028 9.17835 7.31599 8.83807 7.65627C8.49779 7.99655 8.0846 8.16669 7.59849 8.16669C7.36515 8.16669 7.14397 8.12294 6.93494 8.03544C6.72592 7.94794 6.53876 7.82641 6.37349 7.67085L4.65265 8.53127C4.6721 8.61877 4.67939 8.70627 4.67453 8.79377C4.66967 8.88127 4.65751 8.96877 4.63807 9.05627L5.86307 9.75627C6.01863 9.62016 6.19119 9.51565 6.38078 9.44273C6.57036 9.36981 6.77696 9.33335 7.00057 9.33335C7.48668 9.33335 7.89988 9.50349 8.24015 9.84377C8.58043 10.184 8.75057 10.5972 8.75057 11.0834C8.75057 11.5695 8.58043 11.9827 8.24015 12.3229C7.89988 12.6632 7.48668 12.8334 7.00057 12.8334ZM2.91724 9.33335C3.08251 9.33335 3.22106 9.27745 3.33286 9.16565C3.44467 9.05384 3.50057 8.9153 3.50057 8.75002C3.50057 8.58474 3.44467 8.4462 3.33286 8.3344C3.22106 8.22259 3.08251 8.16669 2.91724 8.16669C2.75196 8.16669 2.61342 8.22259 2.50161 8.3344C2.38981 8.4462 2.3339 8.58474 2.3339 8.75002C2.3339 8.9153 2.38981 9.05384 2.50161 9.16565C2.61342 9.27745 2.75196 9.33335 2.91724 9.33335ZM5.25057 3.50002C5.41585 3.50002 5.55439 3.44412 5.66619 3.33231C5.778 3.22051 5.8339 3.08196 5.8339 2.91669C5.8339 2.75141 5.778 2.61287 5.66619 2.50106C5.55439 2.38926 5.41585 2.33335 5.25057 2.33335C5.08529 2.33335 4.94675 2.38926 4.83494 2.50106C4.72314 2.61287 4.66724 2.75141 4.66724 2.91669C4.66724 3.08196 4.72314 3.22051 4.83494 3.33231C4.94675 3.44412 5.08529 3.50002 5.25057 3.50002ZM7.00057 11.6667C7.16585 11.6667 7.30439 11.6108 7.41619 11.499C7.528 11.3872 7.5839 11.2486 7.5839 11.0834C7.5839 10.9181 7.528 10.7795 7.41619 10.6677C7.30439 10.5559 7.16585 10.5 7.00057 10.5C6.83529 10.5 6.69675 10.5559 6.58494 10.6677C6.47314 10.7795 6.41724 10.9181 6.41724 11.0834C6.41724 11.2486 6.47314 11.3872 6.58494 11.499C6.69675 11.6108 6.83529 11.6667 7.00057 11.6667ZM7.5839 7.00002C7.74918 7.00002 7.88772 6.94412 7.99953 6.83231C8.11133 6.72051 8.16724 6.58196 8.16724 6.41669C8.16724 6.25141 8.11133 6.11287 7.99953 6.00106C7.88772 5.88926 7.74918 5.83335 7.5839 5.83335C7.41862 5.83335 7.28008 5.88926 7.16828 6.00106C7.05647 6.11287 7.00057 6.25141 7.00057 6.41669C7.00057 6.58196 7.05647 6.72051 7.16828 6.83231C7.28008 6.94412 7.41862 7.00002 7.5839 7.00002ZM11.0839 4.08335C11.2492 4.08335 11.3877 4.02745 11.4995 3.91565C11.6113 3.80384 11.6672 3.6653 11.6672 3.50002C11.6672 3.33474 11.6113 3.1962 11.4995 3.0844C11.3877 2.97259 11.2492 2.91669 11.0839 2.91669C10.9186 2.91669 10.7801 2.97259 10.6683 3.0844C10.5565 3.1962 10.5006 3.33474 10.5006 3.50002C10.5006 3.6653 10.5565 3.80384 10.6683 3.91565C10.7801 4.02745 10.9186 4.08335 11.0839 4.08335Z"
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
								d="M0.00153996 1.78136H0.0032201C0.00332596 1.86499 0.0363955 1.94522 0.095258 2.00463C0.15412 2.06404 0.23403 2.09786 0.31766 2.09874L8.76792 2.09902C8.85189 2.09861 8.93229 2.06485 8.99154 2.00536C9.0508 1.94586 9.08411 1.86533 9.08418 1.78136H9.08558V0.3171C9.08539 0.23296 9.05185 0.152327 8.9923 0.0928833C8.93275 0.0334395 8.85206 3.68622e-05 8.76792 0H0.31766C0.233423 3.71008e-05 0.152646 0.0335166 0.0930814 0.0930814C0.0335167 0.152646 3.71008e-05 0.233423 0 0.31766C0 0.32312 0.00139988 0.3283 0.00167988 0.33376L0.00153996 1.78136ZM8.76778 4.49314H0.31766C0.233423 4.49318 0.152646 4.52666 0.0930814 4.58622C0.0335167 4.64579 3.71008e-05 4.72656 0 4.8108C0 4.81626 0.00139988 4.82144 0.00167988 4.8269V6.2745H0.00336002C0.00346588 6.35813 0.0365354 6.43836 0.0953979 6.49777C0.15426 6.55718 0.234171 6.591 0.3178 6.59188L8.76806 6.59216C8.85203 6.59175 8.93243 6.55799 8.99168 6.4985C9.05094 6.439 9.08425 6.35847 9.08432 6.2745H9.08572V4.81024C9.08553 4.72605 9.05195 4.64538 8.99234 4.58592C8.93273 4.52647 8.85197 4.4931 8.76778 4.49314ZM8.76778 8.98614H0.31766C0.233423 8.98618 0.152646 9.01966 0.0930814 9.07922C0.0335167 9.13879 3.71008e-05 9.21956 0 9.3038C0 9.30926 0.00139988 9.31444 0.00167988 9.3199V10.7675H0.00336002C0.00346588 10.8511 0.0365354 10.9314 0.0953979 10.9908C0.15426 11.0502 0.234171 11.084 0.3178 11.0849L8.76806 11.0852C8.85205 11.0848 8.93247 11.051 8.99173 10.9914C9.051 10.9319 9.08428 10.8514 9.08432 10.7674H9.08572V9.3031C9.0855 9.21894 9.0519 9.1383 8.99229 9.07887C8.93269 9.01945 8.85194 8.9861 8.76778 8.98614Z"
								className="fill-[#737373] group-hover:fill-white group-data-[state=active]:fill-white"
							/>
						</svg>
						<p className="group-hover:text-white group-data-[state=active]:text-white">
							List
						</p>
					</TabsTrigger>
				</TabsList>
			</Tabs>
			<div className="grid grid-cols-2 gap-2 pt-3 overflow-y-auto pr-1 scrollbar-thin items-start">
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
											expandedMemories.has(memory.id)
												? ""
												: "line-clamp-2",
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
		</div>
	)
}
