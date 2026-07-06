import { useMemo, useState } from "react"
import type {
	ContainerTag,
	ContainerTagAccess,
	ViewMessage,
} from "../../shared/types"
import { WorkspaceCard } from "../components/WorkspaceCard"
import { Input, PageHeader } from "../design/ui"
import { useApp } from "../hooks/useApp"
import { useLog } from "../hooks/useLog"
import { formatTagLabel } from "../lib/formatTag"
import { Search } from "../lib/icons"

interface Props {
	containerTags: ContainerTag[]
	activeTag?: string | null
	assignedTags?: ContainerTagAccess[] | null
	onAdvance: (msg: ViewMessage) => void
	onError: (message: string) => void
}

// Show the search box once the list is long enough to need it.
const SEARCH_THRESHOLD = 8

export function Picker({
	containerTags,
	activeTag,
	assignedTags,
	onAdvance,
	onError,
}: Props) {
	const { callTool } = useApp()
	const log = useLog()
	const [pending, setPending] = useState<string | null>(null)
	const [query, setQuery] = useState("")

	const filtered = useMemo(() => {
		if (!query.trim()) return containerTags
		const q = query.trim().toLowerCase()
		return containerTags.filter(
			(t) =>
				t.name.toLowerCase().includes(q) ||
				t.containerTag.toLowerCase().includes(q),
		)
	}, [containerTags, query])

	const handleSelect = async (containerTag: string) => {
		log("info", `[picker] select: ${containerTag}`)
		setPending(containerTag)
		const result = await callTool<ViewMessage>("set-active-tag", {
			containerTag,
		})
		setPending(null)
		if (!result.ok || !result.data) {
			log("error", `[picker] set-active-tag failed: ${result.error}`)
			onError(result.error ?? "Failed to set active workspace")
			return
		}
		onAdvance(result.data)
	}

	const count = containerTags.length
	const description =
		count === 0
			? "No workspaces available."
			: `${count} workspace${count === 1 ? "" : "s"} available`

	return (
		<div className="flex flex-col">
			<PageHeader description={description} title="Workspaces" />
			<div className="flex flex-col gap-(--space-4) px-(--page-header-px) pb-(--space-6)">
				{count >= SEARCH_THRESHOLD ? (
					<div className="relative max-w-sm">
						<Search className="pointer-events-none absolute left-(--space-3) top-1/2 size-4 -translate-y-1/2 text-text-muted" />
						<Input
							className="pl-(--space-8)"
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search workspaces…"
							value={query}
						/>
					</div>
				) : null}

				{/* Bounded, scrollable list — keeps a stable height without showing scrollbar chrome. */}
				<div className="min-h-[220px] max-h-[60vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					{filtered.length === 0 ? (
						<p className="py-(--space-6) text-center text-(length:--text-sm) text-text-muted">
							No workspaces match “{query}”.
						</p>
					) : (
						<div className="workspace-picker-grid grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-(--space-2)">
							{filtered.map((tag) => {
								const access = assignedTags?.find(
									(t) => t.containerTag === tag.containerTag,
								)
								return (
									<WorkspaceCard
										access={access}
										active={activeTag === tag.containerTag}
										containerTag={tag}
										key={tag.id || tag.containerTag}
										onClick={handleSelect}
									/>
								)
							})}
						</div>
					)}
				</div>

				{pending ? (
					<p className="text-(length:--text-xs) text-text-muted">
						Setting workspace to {formatTagLabel(pending)}…
					</p>
				) : null}
			</div>
		</div>
	)
}
