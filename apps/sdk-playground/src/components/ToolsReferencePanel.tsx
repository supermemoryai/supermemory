"use client"

import { useState } from "react"
import { TOOL_CATALOG, type CatalogTool } from "@/lib/tools-catalog"

export function ToolsReferencePanel() {
	const [expandedId, setExpandedId] = useState<string | null>("documentAdd")

	return (
		<div className="flex min-h-0 flex-col gap-2 text-sm">
			<div>
				<h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
					Tool reference
				</h2>
				<p className="mt-1 text-[10px] leading-snug text-zinc-600">
					Canonical descriptions from{" "}
					<code className="text-zinc-500">@supermemory/tools</code> — what the
					model sees in tools mode.
				</p>
			</div>

			<ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
				{TOOL_CATALOG.map((tool) => (
					<ToolCard
						key={tool.id}
						tool={tool}
						expanded={expandedId === tool.id}
						onToggle={() =>
							setExpandedId((id) => (id === tool.id ? null : tool.id))
						}
					/>
				))}
			</ul>
		</div>
	)
}

function ToolCard({
	tool,
	expanded,
	onToggle,
}: {
	tool: CatalogTool
	expanded: boolean
	onToggle: () => void
}) {
	return (
		<li className="rounded border border-zinc-800 bg-zinc-900/40">
			<button
				type="button"
				onClick={onToggle}
				className="w-full px-2 py-2 text-left"
			>
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<div className="font-mono text-xs text-emerald-400/90">
							{tool.id}
						</div>
						<div className="font-mono text-[10px] text-zinc-600">
							py: {tool.pythonName}
						</div>
					</div>
					<span className="shrink-0 text-[10px] text-zinc-600">
						{expanded ? "−" : "+"}
					</span>
				</div>
				{!expanded && (
					<p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">
						{tool.description}
					</p>
				)}
			</button>

			{expanded && (
				<div className="border-t border-zinc-800 px-2 pb-2 pt-1 space-y-2">
					<p className="text-[11px] leading-relaxed text-zinc-300">
						{tool.description}
					</p>
					{tool.parameters.length > 0 && (
						<div>
							<div className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1">
								Parameters
							</div>
							<ul className="space-y-1.5">
								{tool.parameters.map((param) => (
									<li
										key={param.name}
										className="rounded bg-zinc-950/60 px-2 py-1"
									>
										<div className="flex flex-wrap items-center gap-1">
											<span className="font-mono text-[10px] text-sky-400/90">
												{param.name}
											</span>
											{param.pythonName && param.pythonName !== param.name && (
												<span className="font-mono text-[10px] text-zinc-600">
													/ {param.pythonName}
												</span>
											)}
											{!param.pythonName && (
												<span className="text-[9px] text-sky-500/80">
													TypeScript only
												</span>
											)}
											{param.required && (
												<span className="text-[9px] text-amber-500/80">
													required
												</span>
											)}
										</div>
										<p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
											{param.description}
										</p>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</li>
	)
}
