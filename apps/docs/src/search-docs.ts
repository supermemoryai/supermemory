export interface DocsSearchEnvironment {
	SUPERMEMORY_API_KEY?: string
	DOCS_CONTAINER_TAG: string
}

export async function searchDocumentation(
	question: string,
	env: DocsSearchEnvironment,
) {
	const search = await fetch("https://api.supermemory.ai/v4/search", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.SUPERMEMORY_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			q: question.trim(),
			containerTag: env.DOCS_CONTAINER_TAG,
			searchMode: "documents",
			limit: 6,
			rerank: true,
		}),
		signal: AbortSignal.timeout(20_000),
	})
	if (!search.ok) throw new Error("Documentation search failed")
	const data = (await search.json()) as {
		results: { chunk?: string; metadata?: { url?: string; title?: string } }[]
	}
	return data.results
		.filter((result) => result.chunk && result.metadata?.url)
		.flatMap((result) => {
			const url = new URL(result.metadata?.url ?? "")
			if (
				url.origin !== "https://supermemory.ai" ||
				!url.pathname.startsWith("/docs/")
			)
				return []
			return [
				{
					title: result.metadata?.title ?? url.pathname,
					url: url.href,
					content: result.chunk?.slice(0, 5_000),
				},
			]
		})
}
