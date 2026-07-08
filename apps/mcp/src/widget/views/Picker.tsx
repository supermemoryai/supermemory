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
import { Package, Search } from "../lib/icons"

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
			? "Create a workspace in Supermemory to get started."
			: "Pick the workspace to save and recall from."

	return (
		<div className="flex flex-col">
			<PageHeader description={description} title="Workspaces" />
			<div className="flex flex-col gap-(--space-3) px-(--page-header-px) pb-(--space-6)">
				{count === 0 ? (
					<div className="flex flex-col items-center gap-(--space-2) rounded-xl border border-border bg-[var(--card-bg)] px-(--space-6) py-(--space-10) text-center">
						<Package className="size-7 text-text-muted" />
						<p className="text-(length:--text-sm) font-medium text-text-primary">
							No workspaces yet
						</p>
						<p className="max-w-xs text-(length:--text-xs) leading-relaxed text-text-muted">
							Workspaces you create in Supermemory show up here, ready to save
							and recall from.
						</p>
					</div>
				) : (
					<>
						{count >= SEARCH_THRESHOLD ? (
							<div className="relative">
								<Search className="pointer-events-none absolute left-(--space-3) top-1/2 size-4 -translate-y-1/2 text-text-muted" />
								<Input
									className="pl-(--space-8)"
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Search workspaces…"
									value={query}
								/>
							</div>
						) : null}

						{filtered.length === 0 ? (
							<div className="workspace-picker-grid items-center justify-center py-(--space-8)">
								<p className="px-(--space-4) text-center text-(length:--text-sm) text-text-muted">
									No workspaces match “{query}”.
								</p>
							</div>
						) : (
							<div className="workspace-picker-grid">
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
					</>
				)}

				{pending ? (
					<p className="text-(length:--text-xs) text-text-muted">
						Setting workspace to {formatTagLabel(pending)}…
					</p>
				) : null}
			</div>
		</div>
	)
}
