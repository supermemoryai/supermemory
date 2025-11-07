"use client"

import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { dmSansClassName } from "@/utils/fonts"
import { cn } from "@lib/utils"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

function NoteIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<mask
				id="mask0_344_4970"
				style={{ maskType: "alpha" }}
				maskUnits="userSpaceOnUse"
				x="0"
				y="0"
				width="14"
				height="14"
			>
				<rect width="14" height="14" fill="#D9D9D9" />
			</mask>
			<g mask="url(#mask0_344_4970)">
				<g filter="url(#filter0_i_344_4970)">
					<path
						d="M3.50002 8.75008H7.58335L8.75002 7.58341H3.50002V8.75008ZM3.50002 6.41675H7.00002V5.25008H3.50002V6.41675ZM2.33335 4.08341V9.91675H6.41669L5.25002 11.0834H1.16669V2.91675H12.8334V4.66675H11.6667V4.08341H2.33335ZM13.3584 7.17508C13.407 7.22369 13.4313 7.27716 13.4313 7.3355C13.4313 7.39383 13.407 7.4473 13.3584 7.49591L12.8334 8.02091L11.8125 7.00008L12.3375 6.47508C12.3861 6.42647 12.4396 6.40216 12.4979 6.40216C12.5563 6.40216 12.6097 6.42647 12.6584 6.47508L13.3584 7.17508ZM7.58335 12.2501V11.2292L11.4625 7.35008L12.4834 8.37091L8.60419 12.2501H7.58335Z"
						fill="#FAFAFA"
					/>
				</g>
			</g>
			<defs>
				<filter
					id="filter0_i_344_4970"
					x="1.16669"
					y="2.91675"
					width="12.6176"
					height="9.68628"
					filterUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend
						mode="normal"
						in="SourceGraphic"
						in2="BackgroundImageFix"
						result="shape"
					/>
					<feColorMatrix
						in="SourceAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
						result="hardAlpha"
					/>
					<feOffset dx="0.353028" dy="0.353028" />
					<feGaussianBlur stdDeviation="0.706055" />
					<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
					<feColorMatrix
						type="matrix"
						values="0 0 0 0 0.0431373 0 0 0 0 0.0588235 0 0 0 0 0.0823529 0 0 0 0.4 0"
					/>
					<feBlend
						mode="normal"
						in2="shape"
						result="effect1_innerShadow_344_4970"
					/>
				</filter>
			</defs>
		</svg>
	)
}

export function NotePreview({ document }: { document: DocumentWithMemories }) {
	return (
		<div className="bg-[#0B1017] p-3 rounded-[18px] space-y-2">
			<div className="flex items-center gap-1">
				<NoteIcon />
				<p className={cn(dmSansClassName(), "text-[12px] font-semibold")}>
					Note
				</p>
			</div>
			<div>

			{
				document.title && (
					<p className={cn(dmSansClassName(), "text-[12px] font-semibold")}>
						{document.title}
					</p>
				)
			}
			{document.content && (
				<p className="text-[10px] text-[#737373] line-clamp-4">
					{document.content}
				</p>
			)}
			</div>
		</div>
	)
}

