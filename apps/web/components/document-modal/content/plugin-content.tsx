"use client"

import { useState } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import type {
	ParsedPluginDocument,
	PluginDocumentMessage,
	PluginDocumentSection,
} from "@/lib/plugin-document"

function roleLabel(role: PluginDocumentMessage["role"]): string {
	switch (role) {
		case "user":
			return "User"
		case "assistant":
			return "Assistant"
		case "tool":
			return "Tool"
		case "system":
			return "System"
		default:
			return "Message"
	}
}

function sectionClasses(tone: PluginDocumentSection["tone"]): string {
	switch (tone) {
		case "accent":
			return "border-[#2261CA33] bg-[#0C1829]"
		case "muted":
			return "border-[#252A31] bg-[#11151A]"
		default:
			return "border-[#1E232B] bg-[#0F1318]"
	}
}

function PluginHeader({ parsed }: { parsed: ParsedPluginDocument }) {
	return (
		<div className="px-4 pt-4 pb-3 border-b border-white/6 bg-[#14181E]">
			<div className="flex flex-wrap items-center gap-2">
				<span
					className={cn(
						dmSansClassName(),
						"inline-flex items-center rounded-full border border-[#2261CA33] bg-[#0D1A2E] px-2.5 py-1 text-[11px] font-medium text-[#8FC8FF]",
					)}
				>
					{parsed.pluginLabel}
				</span>
				<span
					className={cn(
						dmSansClassName(),
						"inline-flex items-center rounded-full border border-[#1F242C] bg-[#0F1318] px-2.5 py-1 text-[11px] font-medium text-[#B7BDC7]",
					)}
				>
					{parsed.formatLabel}
				</span>
				{parsed.identifierLabel && parsed.identifierValue && (
					<span
						className={cn(
							dmSansClassName(),
							"inline-flex items-center rounded-full border border-[#1F242C] bg-[#0F1318] px-2.5 py-1 text-[11px] font-medium text-[#8E97A3]",
						)}
					>
						{parsed.identifierLabel}: {parsed.identifierValue}
					</span>
				)}
			</div>
			<p
				className={cn(
					dmSansClassName(),
					"mt-3 text-[18px] font-semibold text-[#FAFAFA] leading-[120%]",
				)}
			>
				{parsed.title}
			</p>
			<p className="mt-1 text-sm text-[#8E97A3] leading-[150%]">
				{parsed.summary}
			</p>
		</div>
	)
}

function ConversationView({ parsed }: { parsed: ParsedPluginDocument }) {
	return (
		<div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-2">
			{parsed.messages.map((message) => (
				<div
					key={message.id}
					className="rounded-[12px] border border-[#1E232B] bg-[#0F1318] px-3 py-2"
				>
					<p
						className={cn(
							dmSansClassName(),
							"text-[10px] uppercase tracking-[0.08em] text-[#737373]",
						)}
					>
						{roleLabel(message.role)}
					</p>
					<p className="mt-1 whitespace-pre-wrap text-[13px] leading-[1.55] text-[#F3F4F6]">
						{message.text}
					</p>
				</div>
			))}
		</div>
	)
}

function SectionsView({ parsed }: { parsed: ParsedPluginDocument }) {
	return (
		<div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
			{parsed.sections.map((section, index) => (
				<div
					key={`${section.label}-${index}`}
					className={cn(
						"rounded-[16px] border px-4 py-4",
						sectionClasses(section.tone),
					)}
				>
					<p
						className={cn(
							dmSansClassName(),
							"text-[12px] font-medium uppercase tracking-[0.08em] text-[#8E97A3]",
						)}
					>
						{section.label}
					</p>
					<p className="mt-2 whitespace-pre-wrap text-[15px] leading-[1.6] text-[#F1F3F5]">
						{section.value}
					</p>
				</div>
			))}
		</div>
	)
}

function RawView({ parsed }: { parsed: ParsedPluginDocument }) {
	return (
		<div className="flex-1 overflow-y-auto scrollbar-thin p-4">
			<pre className="rounded-[16px] border border-[#1E232B] bg-[#0D1116] p-4 whitespace-pre-wrap break-words text-[13px] leading-[1.6] text-[#C7CDD6]">
				{parsed.rawContent}
			</pre>
		</div>
	)
}

export function PluginContent({ parsed }: { parsed: ParsedPluginDocument }) {
	const [mode, setMode] = useState<"structured" | "raw">("structured")
	const hasMessages = parsed.messages.length > 0

	const hideHeader = parsed.kind === "claude-code-doc"

	return (
		<div className="flex h-full flex-col">
			{!hideHeader && <PluginHeader parsed={parsed} />}
			<div className={cn("px-4", hideHeader ? "pt-4" : "pt-3")}>
				<div
					className={cn(
						dmSansClassName(),
						"inline-flex h-9 items-center gap-0.5 rounded-full border border-[#161F2C] bg-[#0D121A] p-0.5",
					)}
				>
					<button
						type="button"
						aria-pressed={mode === "structured"}
						className={cn(
							"inline-flex h-full items-center justify-center rounded-full border px-3 text-xs font-medium cursor-pointer transition-colors",
							mode === "structured"
								? "border-[#2261CA33] bg-[#00173C] text-white"
								: "border-transparent text-[#737373] hover:bg-white/5",
						)}
						onClick={() => setMode("structured")}
					>
						{hasMessages ? "Conversation" : "Structured"}
					</button>
					<button
						type="button"
						aria-pressed={mode === "raw"}
						className={cn(
							"inline-flex h-full items-center justify-center rounded-full border px-3 text-xs font-medium cursor-pointer transition-colors",
							mode === "raw"
								? "border-[#2261CA33] bg-[#00173C] text-white"
								: "border-transparent text-[#737373] hover:bg-white/5",
						)}
						onClick={() => setMode("raw")}
					>
						Raw
					</button>
				</div>
			</div>
			{mode === "raw" ? (
				<RawView parsed={parsed} />
			) : hasMessages ? (
				<ConversationView parsed={parsed} />
			) : (
				<SectionsView parsed={parsed} />
			)}
		</div>
	)
}
