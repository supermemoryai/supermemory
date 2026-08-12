import { useMemo, useState } from "react"
import {
	type ContainerTag,
	type ContainerTagAccess,
	viewMessageSchema,
	type ViewMessage,
} from "../../shared/types"
import { SpaceCard } from "../components/SpaceCard"
import { Input, PageHeader } from "../design/ui"
import { useApp } from "../hooks/useApp"
import { formatTagLabel } from "../lib/formatTag"
import { Package, Search } from "../lib/icons"

interface Props {
	containerTags: ContainerTag[]
	activeTag?: string | null
	assignedTags?: ContainerTagAccess[] | null
	onAdvance: (msg: ViewMessage) => void
	onError: (message: string) => void
	viewId?: string
}

// Show the search box once the list is long enough to need it.
const SEARCH_THRESHOLD = 8

export function Picker({
	containerTags,
	activeTag,
	assignedTags,
	onAdvance,
	onError,
	viewId,
}: Props) {
	const { callTool, handoffToModel } = useApp()
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
		setPending(containerTag)
		const result = await callTool(
			"set-active-tag",
			{
				containerTag,
				viewId,
			},
			viewMessageSchema,
		)
		setPending(null)
		if (!result.ok || !result.data) {
			onError(result.error ?? "Failed to set active space")
			return
		}
		onAdvance(result.data)
		await handoffToModel({
			context: `Supermemory space selection changed. Active space: "${containerTag}". Use it for future Supermemory actions until another space is selected.`,
			message: `I selected "${containerTag}" as my active Supermemory space. Use this space for future Supermemory actions until I select another one.`,
			structuredContent: {
				supermemory: {
					action: "space-selected",
					activeSpace: containerTag,
				},
			},
		})
	}

	const count = containerTags.length
	const description =
		count === 0
			? "Create a space in Supermemory to get started."
			: "Pick the space to save and recall from."

	return (
		<div className="flex flex-col">
			<PageHeader description={description} title="Spaces" />
			<div className="flex flex-col gap-(--space-3) px-(--page-header-px) pb-(--space-6)">
				{count === 0 ? (
					<div className="flex flex-col items-center gap-(--space-2) rounded-xl border border-border bg-[var(--card-bg)] px-(--space-6) py-(--space-10) text-center">
						<Package className="size-7 text-text-muted" />
						<p className="text-(length:--text-sm) font-medium text-text-primary">
							No spaces yet
						</p>
						<p className="max-w-xs text-(length:--text-xs) leading-relaxed text-text-muted">
							Spaces you create in Supermemory show up here, ready to save and
							recall from.
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
									placeholder="Search spaces…"
									value={query}
								/>
							</div>
						) : null}

						{filtered.length === 0 ? (
							<div className="space-picker-grid items-center justify-center py-(--space-8)">
								<p className="px-(--space-4) text-center text-(length:--text-sm) text-text-muted">
									No spaces match “{query}”.
								</p>
							</div>
						) : (
							<div className="space-picker-grid">
								{filtered.map((tag) => {
									const access = assignedTags?.find(
										(t) => t.containerTag === tag.containerTag,
									)
									return (
										<SpaceCard
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
						Setting space to {formatTagLabel(pending)}…
					</p>
				) : null}
			</div>
		</div>
	)
}
