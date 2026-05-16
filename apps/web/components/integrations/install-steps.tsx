"use client"

import { useState, type ReactNode } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import type { InstallStep } from "@/lib/plugin-catalog"

/** Recessed "inside-out" inset shadow used across Supermemory surfaces. */
export const INSET =
	"shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]"

export function PillButton({
	children,
	onClick,
	disabled,
}: {
	children: ReactNode
	onClick?: () => void
	disabled?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				dmSans125ClassName(),
				"relative flex h-8 min-w-[94px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#0D121A] px-3 sm:h-9 sm:min-w-[116px] sm:px-5",
				"text-[12px] font-medium text-[#FAFAFA] sm:text-[14px]",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]",
				"cursor-pointer transition-opacity hover:opacity-80",
				"disabled:cursor-not-allowed disabled:opacity-50",
			)}
		>
			{children}
		</button>
	)
}

export function CopyButton({ text, label }: { text: string; label?: string }) {
	const [copied, setCopied] = useState(false)
	return (
		<button
			type="button"
			aria-label={`Copy ${label ?? "to clipboard"}`}
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(text)
					setCopied(true)
					setTimeout(() => setCopied(false), 2000)
					toast.success(label ? `${label} copied!` : "Copied!")
				} catch {
					toast.error("Failed to copy")
				}
			}}
			className={cn(
				"flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0D121A] transition-opacity hover:opacity-80",
				INSET,
			)}
		>
			{copied ? (
				<Check className="size-3.5 text-[#4BA0FA]" />
			) : (
				<Copy className="size-3.5 text-[#737373]" />
			)}
		</button>
	)
}

export function CodeBlock({
	code,
	copyLabel = "Command",
	secret,
}: {
	code: string
	copyLabel?: string
	secret?: boolean
}) {
	return (
		<div className="group flex min-w-0 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-[#0B0E13] px-3 py-2.5">
			<pre
				className={cn(
					"scrollbar-none min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-[12px] leading-[1.6] text-[#E4E4E7] transition-[filter] duration-150",
					secret &&
						"select-none blur-[5px] group-focus-within:select-text group-focus-within:blur-none group-hover:select-text group-hover:blur-none",
				)}
			>
				{code}
			</pre>
			<CopyButton text={code} label={copyLabel} />
		</div>
	)
}

export function InstallSteps({
	steps,
	apiKey,
}: {
	steps: InstallStep[]
	apiKey?: string
}) {
	return (
		<ol className="flex min-w-0 flex-col gap-4">
			{steps.map((step, i) => (
				<li key={step.title} className="flex min-w-0 gap-3">
					<div className="flex flex-col items-center gap-1.5">
						<span
							className={cn(
								"flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#0D121A] text-[11px] font-semibold text-[#4BA0FA]",
								INSET,
							)}
						>
							{i + 1}
						</span>
						{i < steps.length - 1 && (
							<span className="w-px flex-1 bg-white/[0.14]" />
						)}
					</div>
					<div className="min-w-0 flex-1 space-y-2 pb-1">
						<div className="space-y-0.5">
							<div className="flex items-center gap-2">
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[13px] font-medium text-[#FAFAFA]",
									)}
								>
									{step.title}
								</p>
								{step.optional && (
									<span
										className={cn(
											dmSans125ClassName(),
											"shrink-0 rounded-[4px] bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#A1A1AA]",
										)}
									>
										Optional
									</span>
								)}
							</div>
							{step.description && (
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[12px] leading-relaxed text-[#A1A1AA]",
									)}
								>
									{step.description}
								</p>
							)}
						</div>
						{step.code && (
							<CodeBlock
								code={apiKey ? step.code.replace("sm_...", apiKey) : step.code}
								copyLabel={step.copyLabel}
								secret={step.secret}
							/>
						)}
					</div>
				</li>
			))}
		</ol>
	)
}
