"use client"

import { useQuery } from "@tanstack/react-query"
import { Button } from "@ui/components/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card"
import { Clock, FileText, RefreshCcw, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { listDocuments, type DocumentWithMemories } from "@/lib/api"
import { SearchCommand, useCommandK } from "@/components/search-command"

export default function DashboardPage() {
	const { open, setOpen } = useCommandK()
	const [selectedDocument, setSelectedDocument] =
		useState<DocumentWithMemories | null>(null)
	const documentsQuery = useQuery({
		queryKey: ["desktop-documents"],
		queryFn: listDocuments,
		staleTime: 60 * 1000,
	})
	const documents = documentsQuery.data?.documents ?? []
	const activeDocument = selectedDocument ?? documents.at(0) ?? null
	const totalCount = documentsQuery.data?.pagination.totalItems
	const subtitle = useMemo(() => {
		if (documentsQuery.isPending) return "Loading your recent memories."
		if (typeof totalCount === "number") return `${totalCount} memories indexed.`
		return "Your recent memories."
	}, [documentsQuery.isPending, totalCount])

	return (
		<div className="mx-auto flex h-full w-full max-w-6xl flex-col p-8">
			<div className="mb-8 flex items-center justify-between gap-4">
				<div>
					<h1 className="font-semibold text-2xl">Your memories</h1>
					<p className="text-muted-foreground text-sm">{subtitle}</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						aria-label="Refresh memories"
						onClick={() => documentsQuery.refetch()}
						disabled={documentsQuery.isFetching}
					>
						<RefreshCcw
							className={documentsQuery.isFetching ? "animate-spin" : undefined}
						/>
					</Button>
					<Button variant="outline" onClick={() => setOpen(true)}>
						<Search />
						Search
						<kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">
							⌘K
						</kbd>
					</Button>
				</div>
			</div>

			<div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
				<Card className="min-h-0 gap-0 overflow-hidden py-0">
					<CardHeader className="border-border/60 border-b py-4">
						<CardTitle className="text-base">Recent</CardTitle>
						<CardDescription>
							Latest documents from Supermemory.
						</CardDescription>
					</CardHeader>
					<CardContent className="min-h-0 overflow-auto p-2">
						{documentsQuery.isPending ? (
							<div className="p-4 text-muted-foreground text-sm">
								Loading memories...
							</div>
						) : null}
						{documentsQuery.isError ? (
							<div className="p-4 text-destructive text-sm">
								{documentsQuery.error.message}
							</div>
						) : null}
						{!documentsQuery.isPending && documents.length === 0 ? (
							<div className="p-4 text-muted-foreground text-sm">
								No memories found.
							</div>
						) : null}
						<div className="space-y-1">
							{documents.map((document) => (
								<button
									type="button"
									key={document.id}
									onClick={() => setSelectedDocument(document)}
									className={[
										"flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors",
										activeDocument?.id === document.id
											? "bg-accent text-accent-foreground"
											: "hover:bg-accent/50",
									].join(" ")}
								>
									<FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
									<span className="min-w-0">
										<span className="block truncate font-medium text-sm">
											{document.title ?? document.url ?? "Untitled memory"}
										</span>
										<span className="mt-1 line-clamp-2 block text-muted-foreground text-xs">
											{document.summary ?? document.content ?? document.type}
										</span>
									</span>
								</button>
							))}
						</div>
					</CardContent>
				</Card>

				<DocumentPreview document={activeDocument} />
			</div>

			<SearchCommand open={open} onOpenChange={setOpen} />
		</div>
	)
}

function DocumentPreview({
	document,
}: {
	document: DocumentWithMemories | null
}) {
	if (!document) {
		return (
			<Card className="min-h-0">
				<CardContent className="flex h-full min-h-[360px] items-center justify-center text-muted-foreground text-sm">
					Select a memory to preview it.
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="min-h-0 overflow-hidden">
			<CardHeader className="border-border/60 border-b">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0">
						<CardTitle className="truncate text-lg">
							{document.title ?? "Untitled memory"}
						</CardTitle>
						<CardDescription className="mt-1 flex items-center gap-2">
							<Clock className="size-3.5" />
							{formatDate(document.createdAt)}
						</CardDescription>
					</div>
					{document.type ? (
						<span className="rounded-md bg-muted px-2 py-1 text-muted-foreground text-xs">
							{document.type}
						</span>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="min-h-0 overflow-auto p-6">
				{document.url ? (
					<a
						href={document.url}
						target="_blank"
						rel="noreferrer"
						className="mb-4 block truncate text-primary text-sm underline-offset-4 hover:underline"
					>
						{document.url}
					</a>
				) : null}
				<div className="space-y-4 text-sm leading-6">
					{document.summary ? (
						<section>
							<h2 className="mb-2 font-medium">Summary</h2>
							<p className="text-muted-foreground">{document.summary}</p>
						</section>
					) : null}
					<section>
						<h2 className="mb-2 font-medium">Content</h2>
						<p className="whitespace-pre-wrap text-muted-foreground">
							{document.content ?? document.raw ?? "No content available."}
						</p>
					</section>
				</div>
			</CardContent>
		</Card>
	)
}

function formatDate(value: string | Date) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value))
}
