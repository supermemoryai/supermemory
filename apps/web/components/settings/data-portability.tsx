"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { useAuth } from "@lib/auth-context"
import { useContainerTags } from "@/hooks/use-container-tags"
import {
	Check,
	Download,
	FileDown,
	LoaderIcon,
	Upload,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"

type ExportFormat = "json" | "markdown"

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<p
			className={cn(
				dmSans125ClassName(),
				"font-semibold text-[20px] tracking-[-0.2px] text-[#FAFAFA] px-2",
			)}
		>
			{children}
		</p>
	)
}

function SettingsCard({ children }: { children: React.ReactNode }) {
	return (
		<div
			className={cn(
				"relative bg-[#14161A] rounded-[14px] p-6 w-full overflow-hidden",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
			)}
		>
			{children}
		</div>
	)
}

function PillButton({
	children,
	onClick,
	disabled,
	className,
}: {
	children: React.ReactNode
	onClick?: () => void
	disabled?: boolean
	className?: string
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"relative inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50",
				dmSans125ClassName(),
				className,
			)}
		>
			{children}
		</button>
	)
}

function formatFilterLabel(value: string) {
	return value.replace(/_/g, " ")
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getDownloadFilename(response: Response, fallback: string) {
	const disposition = response.headers.get("content-disposition")
	if (!disposition) return fallback

	const filenameMatch = disposition.match(/filename="?([^";]+)"?/i)
	return filenameMatch?.[1] ?? fallback
}

export function DataPortabilityPanel() {
	const { org } = useAuth()
	const { allProjects } = useContainerTags()
	const [format, setFormat] = useState<ExportFormat>("json")
	const [selectedTags, setSelectedTags] = useState<string[]>([])
	const [startDate, setStartDate] = useState("")
	const [endDate, setEndDate] = useState("")
	const [isExporting, setIsExporting] = useState(false)
	const [isImporting, setIsImporting] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const availableTags = useMemo(() => {
		return [...new Set((allProjects ?? []).map((project) => project.containerTag))]
			.filter(Boolean)
			.sort((a, b) => a.localeCompare(b))
	}, [allProjects])

	const canExport = !isExporting
	const activeTagSummary =
		selectedTags.length > 0
			? `${selectedTags.length} selected`
			: org?.id
				? `Current org: ${org.name ?? org.id}`
				: "All memories"

	const toggleTag = (tag: string) => {
		setSelectedTags((current) =>
			current.includes(tag)
				? current.filter((currentTag) => currentTag !== tag)
				: [...current, tag],
		)
	}

	const downloadBlob = (blob: Blob, filename: string) => {
		const url = window.URL.createObjectURL(blob)
		const anchor = document.createElement("a")
		anchor.href = url
		anchor.download = filename
		document.body.appendChild(anchor)
		anchor.click()
		anchor.remove()
		window.URL.revokeObjectURL(url)
	}

	const handleExport = async (selectedFormat: ExportFormat) => {
		if (!canExport) return
		setIsExporting(true)
		try {
			const params = new URLSearchParams()
			params.set("format", selectedFormat)
			for (const tag of selectedTags) {
				params.append("containerTags", tag)
			}
			if (startDate) params.set("startDate", startDate)
			if (endDate) params.set("endDate", endDate)

			const response = await fetch(`/api/memories/export?${params.toString()}`, {
				credentials: "include",
			})

			if (!response.ok) {
				const body = await response.json().catch(() => ({}))
				throw new Error(
					(isPlainObject(body) && typeof body.error === "string"
						? body.error
						: null) ?? "Failed to export memories",
				)
			}

			const filename = getDownloadFilename(
				response,
				`supermemory-export.${selectedFormat === "markdown" ? "md" : "json"}`,
			)
			downloadBlob(await response.blob(), filename)
			toast.success("Export downloaded")
		} catch (error) {
			toast.error("Failed to export memories", {
				description: error instanceof Error ? error.message : undefined,
			})
		} finally {
			setIsExporting(false)
		}
	}

	const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		event.target.value = ""
		if (!file) return

		setIsImporting(true)
		try {
			const text = await file.text()
			const parsed = JSON.parse(text) as unknown

			const response = await fetch("/api/memories/import", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(parsed),
			})

			if (!response.ok) {
				const body = await response.json().catch(() => ({}))
				throw new Error(
					(isPlainObject(body) && typeof body.error === "string"
						? body.error
						: null) ?? "Failed to import memories",
				)
			}

			const result = (await response.json()) as { imported?: number }
			toast.success("Import completed", {
				description: `${result.imported ?? 0} memories imported successfully.`,
			})
		} catch (error) {
			toast.error("Failed to import memories", {
				description: error instanceof Error ? error.message : undefined,
			})
		} finally {
			setIsImporting(false)
		}
	}

	return (
		<div className="flex flex-col gap-8 w-full">
			<section className="flex flex-col gap-4">
				<SectionTitle>Data portability</SectionTitle>
				<SettingsCard>
					<div className="flex flex-col gap-6">
						<div className="flex flex-col gap-1.5">
							<p
								className={cn(
									dmSans125ClassName(),
									"font-normal text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
								)}
							>
								Backup, migrate, or archive your memories.
							</p>
							<p
								className={cn(
									dmSans125ClassName(),
									"font-medium text-[16px] tracking-[-0.16px] text-[#737373]",
								)}
							>
								Export memories as JSON or Markdown and import previous JSON
								archives later.
							</p>
						</div>

						<div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
							<div className="rounded-[14px] border border-white/8 bg-[#0D121A] p-4 sm:p-5">
								<div className="flex items-start justify-between gap-4">
									<div className="space-y-1">
										<p className="text-sm font-semibold text-white">Export memories</p>
										<p className="text-sm text-white/55">
											Choose a format, then optionally narrow by date or tags.
										</p>
									</div>
									<Download className="mt-0.5 size-4 shrink-0 text-white/40" />
								</div>

								<div className="mt-4 flex flex-wrap gap-2">
									<PillButton
										onClick={() => setFormat("json")}
										className={format === "json" ? "bg-white text-black" : "bg-white/5 text-white"}
									>
										JSON
									</PillButton>
									<PillButton
										onClick={() => setFormat("markdown")}
										className={format === "markdown" ? "bg-white text-black" : "bg-white/5 text-white"}
									>
										Markdown
									</PillButton>
								</div>

								<div className="mt-5 grid gap-3 sm:grid-cols-2">
									<label className="flex flex-col gap-1.5 text-sm text-white/60">
										<span>Start date</span>
										<input
											type="date"
											value={startDate}
											onChange={(event) => setStartDate(event.target.value)}
											className="rounded-xl border border-white/8 bg-[#0A0C11] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#4BA0FA]/50"
										/>
									</label>
									<label className="flex flex-col gap-1.5 text-sm text-white/60">
										<span>End date</span>
										<input
											type="date"
											value={endDate}
											onChange={(event) => setEndDate(event.target.value)}
											className="rounded-xl border border-white/8 bg-[#0A0C11] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#4BA0FA]/50"
										/>
									</label>
								</div>

								<div className="mt-5 space-y-2">
									<div className="flex items-center justify-between gap-3">
										<p className="text-sm font-medium text-white">Filter by tags</p>
										<p className="text-xs text-white/45">{activeTagSummary}</p>
									</div>
									<div className="flex flex-wrap gap-2">
										{availableTags.length > 0 ? (
											availableTags.map((tag) => {
												const isSelected = selectedTags.includes(tag)
												return (
													<button
														key={tag}
														type="button"
														onClick={() => toggleTag(tag)}
														className={cn(
															"inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors",
															isSelected
																? "border-[#4BA0FA]/50 bg-[#4BA0FA]/10 text-[#8FC2FF]"
																: "border-white/8 bg-white/3 text-white/65 hover:bg-white/5",
														)}
													>
														{isSelected ? <Check className="size-3.5" /> : null}
														{formatFilterLabel(tag)}
													</button>
												)
											})
										) : (
											<p className="text-sm text-white/45">
												No container tags are available yet.
											</p>
										)}
									</div>
								</div>

								<div className="mt-5 flex items-center justify-between gap-3">
									<p className="text-xs text-white/45">
										Markdown is best for human-readable backups. JSON is best for
										round-tripping.
									</p>
									<PillButton
										onClick={() => handleExport(format)}
										disabled={!canExport}
										className="bg-[#4BA0FA] text-[#00171A]"
									>
										{isExporting ? (
											<LoaderIcon className="size-4 animate-spin" />
										) : (
											<FileDown className="size-4" />
										)}
										{isExporting ? "Exporting..." : "Download export"}
									</PillButton>
								</div>
							</div>

							<div className="rounded-[14px] border border-white/8 bg-[#0D121A] p-4 sm:p-5">
								<div className="flex items-start justify-between gap-4">
									<div className="space-y-1">
										<p className="text-sm font-semibold text-white">Import memories</p>
										<p className="text-sm text-white/55">
											Upload a previously exported JSON archive to restore memories.
										</p>
									</div>
									<Upload className="mt-0.5 size-4 shrink-0 text-white/40" />
								</div>

								<div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/2 p-4">
									<label className="flex cursor-pointer flex-col items-center justify-center gap-3 text-center">
										<span className="rounded-full bg-white/5 p-3 text-white/70">
											<Upload className="size-5" />
										</span>
										<span className="text-sm font-medium text-white">
											Choose backup file
										</span>
										<span className="text-xs text-white/45">
											Accepts the JSON export produced by this panel.
										</span>
										<input
											ref={fileInputRef}
											type="file"
											accept="application/json,.json"
											onChange={handleImportFile}
											className="hidden"
										/>
									</label>
								</div>

								<p className="mt-4 text-xs text-white/45">
									Import keeps any container tags stored in the archive. If you want to
									move memories into a different workspace, export the JSON and adjust
									tags before importing.
								</p>
								<PillButton
									onClick={() => {
										fileInputRef.current?.click()
									}}
									className="mt-5 bg-white/5 text-white"
									disabled={isImporting}
								>
									{isImporting ? (
										<LoaderIcon className="size-4 animate-spin" />
									) : (
										<Upload className="size-4" />
									)}
									{isImporting ? "Importing..." : "Import JSON archive"}
								</PillButton>
							</div>
						</div>
					</div>
				</SettingsCard>
			</section>
		</div>
	)
}
