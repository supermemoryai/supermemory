import {
	ActionPanel,
	Detail,
	List,
	Action,
	Icon,
	showToast,
	Toast,
	getSelectedText,
} from "@raycast/api"
import { useEffect, useRef, useState } from "react"
import { searchMemories, type SearchResult } from "./api"
import { createSearchInputAdapter } from "./deferred-prefill"
import { usePromise } from "@raycast/utils"
import { withSupermemory } from "./withSupermemory"

const extractContent = (memory: SearchResult) => {
	if (memory.chunks && memory.chunks.length > 0) {
		return memory.chunks
			.map((chunk: unknown) => {
				if (typeof chunk === "string") return chunk
				if (
					chunk &&
					typeof chunk === "object" &&
					"content" in chunk &&
					typeof chunk.content === "string"
				)
					return chunk.content
				if (
					chunk &&
					typeof chunk === "object" &&
					"text" in chunk &&
					typeof chunk.text === "string"
				)
					return chunk.text
				return ""
			})
			.filter(Boolean)
			.join(" ")
	}
	return "No content available"
}

const extractUrl = (memory: SearchResult) => {
	if (memory.metadata?.url && typeof memory.metadata.url === "string") {
		return memory.metadata.url
	}
	return null
}

const truncateContent = (content: string, maxLength = 100) => {
	if (content.length <= maxLength) return content
	return `${content.substring(0, maxLength)}...`
}

export default withSupermemory(Command)
export function Command() {
	const [searchText, setSearchText] = useState("")
	const [searchQuery, setSearchQuery] = useState("")
	const searchInputRef = useRef<
		ReturnType<typeof createSearchInputAdapter> | undefined
	>(undefined)
	searchInputRef.current ??= createSearchInputAdapter(
		setSearchText,
		setSearchQuery,
	)
	const searchInput = searchInputRef.current

	useEffect(() => {
		const request = searchInput.startPrefill(getSelectedText)
		return () => {
			request.cancel()
			searchInput.cancelPendingQuery()
		}
	}, [searchInput])

	const { isLoading, data: searchResults = [] } = usePromise(
		async (query: string) => {
			const q = query.trim()
			if (!q) return []

			const results = await searchMemories({
				q,
				limit: 50,
			})
			if (!results.length) {
				await showToast({
					style: Toast.Style.Success,
					title: "Search Complete",
					message: "No memories found for your query",
				})
			}
			return results
		},
		[searchQuery],
	)

	const formatDate = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			})
		} catch {
			return "Unknown date"
		}
	}

	const isSearching = isLoading || searchText !== searchQuery
	const hasSearched = !isSearching && !searchResults.length
	return (
		<List
			{...searchInput.getListProps(searchText)}
			isLoading={isSearching}
			searchBarPlaceholder="Search your memories..."
		>
			{hasSearched && !searchText.trim() ? (
				<List.EmptyView
					icon={Icon.MagnifyingGlass}
					title="Search Your Memories"
					description="Type to search through your Supermemory collection"
				/>
			) : hasSearched ? (
				<List.EmptyView
					icon={Icon.Document}
					title="No Memories Found"
					description={`No memories found for "${searchText}"`}
				/>
			) : isSearching && searchText.trim() ? (
				<List.EmptyView
					icon={Icon.MagnifyingGlass}
					title="Searching Your Memories"
				/>
			) : (
				searchResults.map((memory) => {
					const content = extractContent(memory)
					const url = extractUrl(memory)
					return (
						<List.Item
							key={memory.documentId}
							icon={url ? Icon.Link : Icon.Document}
							title={memory.title || "Untitled Memory"}
							subtitle={{ value: truncateContent(content), tooltip: content }}
							accessories={[
								{ text: formatDate(memory.createdAt) },
								...(memory.score
									? [{ text: `${Math.round(memory.score * 100)}%` }]
									: []),
							]}
							actions={
								<ActionPanel>
									<Action.Push
										title="View Details"
										target={<MemoryDetail memory={memory} />}
										icon={Icon.Eye}
									/>
									<Action.CopyToClipboard
										title="Copy Content"
										shortcut={{ modifiers: ["cmd"], key: "c" }}
										content={content}
									/>
									{url && (
										<Action.OpenInBrowser
											title="Open URL"
											url={url}
											shortcut={{ modifiers: ["cmd"], key: "o" }}
										/>
									)}
								</ActionPanel>
							}
						/>
					)
				})
			)}
		</List>
	)
}

function MemoryDetail({ memory }: { memory: SearchResult }) {
	const content = extractContent(memory)
	const url = extractUrl(memory)

	const markdown = `
# ${memory.title || "Untitled Memory"}

${content}

---

**Created:** ${new Date(memory.createdAt).toLocaleString()}
${url ? `**URL:** ${url}` : ""}
${memory.score ? `**Relevance:** ${Math.round(memory.score * 100)}%` : ""}
`

	return (
		<Detail
			markdown={markdown}
			actions={
				<ActionPanel>
					<Action.CopyToClipboard
						title="Copy Content"
						shortcut={{ modifiers: ["cmd"], key: "c" }}
						content={content}
					/>
					{url && (
						<Action.OpenInBrowser
							title="Open URL"
							url={url}
							shortcut={{ modifiers: ["cmd"], key: "o" }}
						/>
					)}
				</ActionPanel>
			}
		/>
	)
}
