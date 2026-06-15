"use client"

import { useState, useEffect, useMemo } from "react"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { dmSansClassName } from "@/lib/fonts"
import { useHotkeys } from "react-hotkeys-hook"
import { Image as ImageIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { extractUrls, getFaviconUrl, normalizeUrl } from "@/lib/url-helpers"

export interface LinkData {
	url: string
	title: string
	description: string
	image?: string
	bulkUrls?: string[]
}

interface LinkContentProps {
	onSubmit?: (data: LinkData) => void
	onDataChange?: (data: LinkData) => void
	isSubmitting?: boolean
	isOpen?: boolean
	initialData?: LinkData
}

const prettyUrl = (url: string) =>
	url.replace(/^https?:\/\//, "").replace(/\/$/, "")

export function LinkContent({
	onSubmit,
	onDataChange,
	isSubmitting,
	isOpen,
	initialData,
}: LinkContentProps) {
	const [url, setUrl] = useState(initialData?.url ?? "")
	const [title, setTitle] = useState(initialData?.title ?? "")
	const [description, setDescription] = useState(initialData?.description ?? "")
	const [image, setImage] = useState<string | undefined>(initialData?.image)
	const [isPreviewLoading, setIsPreviewLoading] = useState(false)
	const [deselected, setDeselected] = useState<Set<string>>(new Set())

	const { urls: detectedUrls, duplicates } = useMemo(
		() => extractUrls(url),
		[url],
	)
	const isBulk = detectedUrls.length >= 2
	const selectedUrls = useMemo(
		() => detectedUrls.filter((u) => !deselected.has(u)),
		[detectedUrls, deselected],
	)

	const canSubmit =
		(isBulk ? selectedUrls.length > 0 : url.trim().length > 0) && !isSubmitting

	useEffect(() => {
		const selected = detectedUrls.filter((u) => !deselected.has(u))
		onDataChange?.({
			url: url.trim(),
			title,
			description,
			...(image && { image }),
			...(detectedUrls.length >= 2 && { bulkUrls: selected }),
		})
	}, [url, title, description, image, detectedUrls, deselected, onDataChange])

	const handleSubmit = () => {
		if (!canSubmit || !onSubmit) return
		if (isBulk) {
			onSubmit({ url: "", title, description, bulkUrls: selectedUrls })
			return
		}
		onSubmit({ url: normalizeUrl(url.trim()), title, description })
	}

	const toggleUrl = (u: string) =>
		setDeselected((prev) => {
			const next = new Set(prev)
			if (next.has(u)) next.delete(u)
			else next.add(u)
			return next
		})

	const handlePreviewLink = async () => {
		if (!url.trim()) {
			toast.error("Please enter a URL first")
			return
		}

		const normalizedUrl = normalizeUrl(url.trim())
		if (normalizedUrl !== url) setUrl(normalizedUrl)

		setIsPreviewLoading(true)
		try {
			const response = await fetch(
				`/api/og?url=${encodeURIComponent(normalizedUrl)}`,
			)

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.error || "Failed to fetch preview")
			}

			const data = await response.json()

			setTitle(data.title || "")
			setDescription(data.description || "")
			setImage(data.image || undefined)

			if (!data.title && !data.description && !data.image) {
				toast.info("No Open Graph data found for this URL")
			} else {
				toast.success("Preview loaded successfully")
			}
		} catch (error) {
			console.error("Preview error:", error)
			toast.error(
				error instanceof Error ? error.message : "Failed to load preview",
			)
		} finally {
			setIsPreviewLoading(false)
		}
	}

	useHotkeys("mod+enter", handleSubmit, {
		enabled: isOpen && canSubmit,
		enableOnFormTags: ["INPUT", "TEXTAREA"],
	})

	useEffect(() => {
		if (!isOpen) {
			setUrl("")
			setTitle("")
			setDescription("")
			setImage(undefined)
			setDeselected(new Set())
			onDataChange?.({ url: "", title: "", description: "" })
		}
	}, [isOpen, onDataChange])

	return (
		<div
			className={cn(
				"flex flex-col space-y-4 pt-0 mb-4 md:pt-4",
				dmSansClassName(),
			)}
		>
			<div>
				<p
					className={cn("text-[16px] font-medium pl-2 pb-2", dmSansClassName())}
				>
					Paste one link — or many — to turn them into memories
				</p>
				<div className="flex relative">
					<textarea
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						placeholder="https://example.com — paste multiple links to save them all"
						disabled={isSubmitting}
						rows={isBulk ? 3 : 1}
						className="w-full resize-none p-4 rounded-xl bg-[#14161A] shadow-inside-out disabled:opacity-50 outline-1 outline-transparent focus:outline-[#525D6EB2]"
					/>
					{!isBulk && (
						<Button
							variant="linkPreview"
							className="absolute right-2 top-2"
							disabled={isSubmitting || isPreviewLoading || !url.trim()}
							onClick={handlePreviewLink}
						>
							{isPreviewLoading ? (
								<>
									<Loader2 className="size-4 animate-spin mr-2" />
									Loading…
								</>
							) : (
								"Preview Link"
							)}
						</Button>
					)}
				</div>
			</div>

			{isBulk ? (
				<div className="bg-[#14161A] rounded-[14px] py-4 px-3 space-y-2 shadow-inside-out">
					<div className="flex items-center justify-between px-1 pb-1">
						<p className="font-semibold text-[15px]">
							Found {detectedUrls.length} links
							{duplicates > 0 && (
								<span className="text-[#737373] font-normal">
									{" "}
									· {duplicates} duplicate{duplicates === 1 ? "" : "s"} removed
								</span>
							)}
						</p>
						<div className="flex gap-3 text-[12px] text-[#4BA0FA]">
							<button
								type="button"
								className="cursor-pointer hover:opacity-80"
								onClick={() => setDeselected(new Set())}
							>
								Select all
							</button>
							<button
								type="button"
								className="cursor-pointer hover:opacity-80"
								onClick={() => setDeselected(new Set(detectedUrls))}
							>
								Clear
							</button>
						</div>
					</div>
					<div className="max-h-[38dvh] overflow-y-auto scrollbar-thin space-y-1 pr-1">
						{detectedUrls.map((u) => {
							const favicon = getFaviconUrl(u)
							return (
								<label
									key={u}
									className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5 cursor-pointer"
								>
									<input
										type="checkbox"
										checked={!deselected.has(u)}
										onChange={() => toggleUrl(u)}
										disabled={isSubmitting}
										className="size-4 shrink-0 accent-[#4BA0FA]"
									/>
									{favicon ? (
										<img
											src={favicon}
											alt=""
											className="size-4 shrink-0 rounded-sm"
											onError={(e) => {
												e.currentTarget.style.visibility = "hidden"
											}}
										/>
									) : (
										<ImageIcon className="size-4 shrink-0 text-[#737373]" />
									)}
									<span className="truncate text-[14px] text-[#E5E5E5]">
										{prettyUrl(u)}
									</span>
								</label>
							)
						})}
					</div>
					<p className="px-1 pt-1 text-[12px] text-[#737373]">
						{selectedUrls.length} selected · each link becomes its own memory
					</p>
				</div>
			) : (
				<div className="bg-[#14161A] rounded-[14px] py-6 px-4 space-y-4 shadow-inside-out">
					<div>
						<p className="pl-2 pb-2 font-semibold text-[16px] text-[#737373]">
							Link title
						</p>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Mahesh Sanikommu - Portfolio"
							disabled
							className="w-full px-4 py-3 bg-[#0F1217] rounded-xl disabled:opacity-50 outline-1 outline-transparent focus:outline-[#525D6EB2]"
						/>
					</div>
					<div>
						<p className="pl-2 pb-2 font-semibold text-[16px] text-[#737373]">
							Link description
						</p>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Portfolio website of Mahesh Sanikommu"
							disabled
							className="w-full px-4 py-3 bg-[#0F1217] rounded-xl resize-none disabled:opacity-50 outline-1 outline-transparent focus:outline-[#525D6EB2]"
						/>
					</div>
					<div>
						<p className="pl-2 pb-2 font-semibold text-[16px] text-[#737373]">
							Link Preview Image
						</p>
						{image ? (
							<div className="w-full max-w-md aspect-4/2 bg-[#0F1217] rounded-xl overflow-hidden">
								<img
									src={image}
									alt={title || "Link preview"}
									className="size-full object-cover"
									onError={(e) => {
										e.currentTarget.style.display = "none"
										e.currentTarget.parentElement?.classList.add("opacity-50")
										e.currentTarget.parentElement?.classList.add("flex")
										e.currentTarget.parentElement?.classList.add("items-center")
										e.currentTarget.parentElement?.classList.add(
											"justify-center",
										)
									}}
								/>
							</div>
						) : (
							<div className="w-full max-w-md aspect-4/2 bg-[#0F1217] opacity-50 rounded-xl flex items-center justify-center">
								<ImageIcon className="size-8 text-[#737373]" />
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
