import { createHash } from "node:crypto"
import type Supermemory from "supermemory"
import type {
	DocumentAddParams,
	DocumentListResponse,
	DocumentUpdateParams,
} from "supermemory/resources/documents"

const concurrency = 4
const processingTimeout = 15 * 60 * 1000
const source = "deployed-docs"

type Page = {
	title: string
	markdownUrl: string
	url: string
	slug: string
	customId: string
}

type Document = DocumentListResponse.Memory

const hash = (value: string) => createHash("sha256").update(value).digest("hex")

async function mapConcurrent<T, R>(
	items: T[],
	run: (item: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length)
	let next = 0
	let failed = false
	const workers = await Promise.allSettled(
		Array.from({ length: Math.min(concurrency, items.length) }, async () => {
			while (!failed && next < items.length) {
				const index = next++
				try {
					results[index] = await run(items[index])
				} catch (error) {
					failed = true
					throw error
				}
			}
		}),
	)
	const failure = workers.find((worker) => worker.status === "rejected")
	if (failure?.status === "rejected") throw failure.reason
	return results
}

async function fetchMarkdown(url: string): Promise<string> {
	for (let attempt = 0; attempt < 3; attempt++) {
		let response: Response
		try {
			response = await fetch(url, {
				headers: { Accept: "text/markdown, text/plain" },
				redirect: "error",
				signal: AbortSignal.timeout(30_000),
			})
		} catch {
			if (attempt === 2) throw new Error(`Could not fetch ${url}`)
			await Bun.sleep(500 * 2 ** attempt)
			continue
		}
		if (!response.ok) {
			if (attempt < 2 && (response.status === 429 || response.status >= 500)) {
				await response.body?.cancel()
				await Bun.sleep(500 * 2 ** attempt)
				continue
			}
			throw new Error(`HTTP ${response.status} fetching ${url}`)
		}
		const contentType = response.headers.get("content-type") ?? ""
		if (!/^text\/(markdown|plain|x-markdown)\b/i.test(contentType)) {
			throw new Error(`Expected a Markdown export at ${url}`)
		}
		let text: string
		try {
			text = (await response.text()).replace(/\r\n/g, "\n").trim()
		} catch {
			throw new Error(`Could not read the complete export at ${url}`)
		}
		if (!text || /^(?:<!doctype html|<html\b)/i.test(text)) {
			throw new Error(`Empty or malformed Markdown export at ${url}`)
		}
		return text
	}
	throw new Error(`Could not fetch ${url}`)
}

function parseInventory(
	text: string,
	site: URL,
	canonicalSite: URL,
	containerTag: string,
): Page[] {
	const pages = new Map<string, Page>()
	for (const line of text.split("\n")) {
		const linkPattern = /\[([^\n]+?)\]\(<?([^\s<>]+)>?\)/g
		const links = [...line.matchAll(linkPattern)]
		const remainder = line.replace(linkPattern, "")
		if (
			(/^\s*[-*+]\s*\[/.test(remainder) || /\]\(/.test(remainder)) &&
			/\.md(?:[?#)]|\s|$)/i.test(remainder)
		) {
			throw new Error("Malformed Markdown page link in /llms.txt")
		}
		for (const [, label, target] of links) {
			let markdown: URL
			try {
				markdown = new URL(target, site)
			} catch {
				throw new Error("Invalid page URL in /llms.txt")
			}
			if (!markdown.pathname.endsWith(".md")) continue
			if (
				markdown.origin !== site.origin ||
				!markdown.pathname.startsWith(site.pathname) ||
				markdown.search ||
				markdown.hash ||
				markdown.username ||
				markdown.password
			) {
				throw new Error("Markdown page link outside DOCS_SITE_URL in /llms.txt")
			}
			const title = label.trim()
			const slug = markdown.pathname.slice(site.pathname.length, -3)
			if (!title || !slug)
				throw new Error("Invalid page title or slug in /llms.txt")
			const canonical = new URL(slug === "index" ? "" : slug, canonicalSite)
			const page: Page = {
				title,
				slug,
				url: canonical.href,
				markdownUrl: markdown.href,
				customId: `docs_${hash(`${containerTag}\n${canonical.href}`)}`,
			}
			const previous = pages.get(page.url)
			if (previous && previous.title !== title) {
				throw new Error(`Conflicting titles for ${page.url} in /llms.txt`)
			}
			pages.set(page.url, page)
		}
	}
	if (!pages.size) throw new Error("/llms.txt contains no Markdown pages")
	return [...pages.values()].sort((a, b) => a.url.localeCompare(b.url))
}

async function api<T>(label: string, request: () => Promise<T>): Promise<T> {
	try {
		return await request()
	} catch (error) {
		const status =
			typeof error === "object" && error !== null && "status" in error
				? error.status
				: undefined
		throw new Error(
			`${label}: Supermemory request failed${typeof status === "number" ? ` (HTTP ${status})` : ""}`,
		)
	}
}

async function listDocuments(client: Supermemory, containerTag: string) {
	const documents: Document[] = []
	const ids = new Set<string>()
	let totalItems: number | undefined
	let totalPages: number | undefined
	for (let page = 1; ; page++) {
		const result = await api(`List page ${page}`, () =>
			client.documents.list({
				containerTags: [containerTag],
				page,
				limit: 100,
				sort: "createdAt",
				order: "asc",
			}),
		)
		const pagination = result.pagination
		if (
			!Array.isArray(result.memories) ||
			!pagination ||
			pagination.currentPage !== page ||
			!Number.isSafeInteger(pagination.totalItems) ||
			pagination.totalItems < 0 ||
			!Number.isSafeInteger(pagination.totalPages) ||
			pagination.totalPages < 0 ||
			pagination.totalPages !== Math.ceil(pagination.totalItems / 100) ||
			(totalItems !== undefined && totalItems !== pagination.totalItems) ||
			(totalPages !== undefined && totalPages !== pagination.totalPages)
		) {
			throw new Error(
				"Malformed or changing document pagination; refusing to sync",
			)
		}
		totalItems = pagination.totalItems
		totalPages = pagination.totalPages
		for (const document of result.memories) {
			if (!document.id || ids.has(document.id)) {
				throw new Error("Missing or duplicate document ID in pagination")
			}
			ids.add(document.id)
			documents.push(document)
		}
		if (page >= totalPages) break
		if (!result.memories.length)
			throw new Error("Incomplete document pagination")
	}
	if (documents.length !== totalItems) {
		throw new Error("Incomplete document inventory; refusing to sync")
	}
	return documents
}

function metadataOf(document: Pick<Document, "metadata">) {
	const metadata = document.metadata
	return typeof metadata === "object" &&
		metadata !== null &&
		!Array.isArray(metadata)
		? metadata
		: {}
}

async function waitUntilDone(
	client: Supermemory,
	id: string,
	contentHash?: string,
) {
	const deadline = Date.now() + processingTimeout
	while (Date.now() < deadline) {
		const document = await api(`Get ${id}`, () => client.documents.get(id))
		if (document.status === "failed") {
			throw new Error(
				`Document ${id} processing failed; no removed pages were deleted`,
			)
		}
		if (document.status === "done") {
			if (contentHash && metadataOf(document).contentHash !== contentHash) {
				throw new Error(
					`Document ${id} hash mismatch; refusing to delete removed pages`,
				)
			}
			return
		}
		if (
			![
				"unknown",
				"queued",
				"extracting",
				"chunking",
				"embedding",
				"indexing",
			].includes(document.status)
		) {
			throw new Error(`Document ${id} has an unrecognized processing status`)
		}
		await Bun.sleep(2_000)
	}
	throw new Error(
		`Document ${id} processing timed out; no removed pages were deleted`,
	)
}

async function main() {
	const args = Bun.argv.slice(2)
	if (args.includes("--help")) {
		console.log(`Usage: bun scripts/index-docs.ts [--dry-run] [--help]

DOCS_SITE_URL       Required explicit deployed documentation URL (including any base path).
DOCS_CANONICAL_URL  Optional public URL for citations (default: DOCS_SITE_URL).
SUPERMEMORY_API_KEY Required for sync, never used by --dry-run.
DOCS_CONTAINER_TAG Optional container tag (default: supermemory_docs).

Fetches /llms.txt and every linked .md export, including generated API pages.
Sync replaces changed documents, waits up to 15 minutes per document for processing,
and then deletes removed documents owned by this script for this site only.
Run one sync at a time per site/container. Dry run only validates and lists public pages;
it does not query Supermemory, calculate a remote diff, or perform any writes.`)
		return
	}
	if (args.some((arg) => arg !== "--dry-run"))
		throw new Error("Unknown argument; use --help")
	const dryRun = args.includes("--dry-run")
	const siteUrl = process.env.DOCS_SITE_URL
	if (!siteUrl) throw new Error("DOCS_SITE_URL is required")
	let site: URL
	try {
		site = new URL(siteUrl)
	} catch {
		throw new Error("DOCS_SITE_URL must be an absolute HTTP(S) URL")
	}
	if (
		!["http:", "https:"].includes(site.protocol) ||
		site.username ||
		site.password ||
		site.search ||
		site.hash
	) {
		throw new Error(
			"DOCS_SITE_URL must be an HTTP(S) URL without credentials, query, or fragment",
		)
	}
	site.pathname = `${site.pathname.replace(/\/+$/, "")}/`
	const canonicalSite = new URL(process.env.DOCS_CANONICAL_URL ?? site.href)
	if (
		!["http:", "https:"].includes(canonicalSite.protocol) ||
		canonicalSite.username ||
		canonicalSite.password ||
		canonicalSite.search ||
		canonicalSite.hash
	) {
		throw new Error(
			"DOCS_CANONICAL_URL must be an HTTP(S) URL without credentials, query, or fragment",
		)
	}
	canonicalSite.pathname = `${canonicalSite.pathname.replace(/\/+$/, "")}/`
	const containerTag = process.env.DOCS_CONTAINER_TAG ?? "supermemory_docs"
	if (!/^[a-zA-Z0-9_-]{1,100}$/.test(containerTag)) {
		throw new Error(
			"DOCS_CONTAINER_TAG must be 1–100 alphanumeric, hyphen, or underscore characters",
		)
	}
	const apiKey = process.env.SUPERMEMORY_API_KEY
	if (!dryRun && !apiKey)
		throw new Error("SUPERMEMORY_API_KEY is required for sync")
	const inventoryUrl = new URL("llms.txt", site).href
	const inventory = await fetchMarkdown(inventoryUrl)
	const pages = parseInventory(inventory, site, canonicalSite, containerTag)
	const exports = await mapConcurrent(pages, async (page) => {
		const content = await fetchMarkdown(page.markdownUrl)
		const metadata = {
			source,
			siteUrl: canonicalSite.href,
			title: page.title,
			url: page.url,
			slug: page.slug,
			contentHash: hash(content),
			taskType: "superrag",
		}
		return { ...page, content, metadata }
	})
	if (dryRun) {
		for (const page of exports) console.log(`${page.customId} ${page.url}`)
		console.log(
			`Dry run: validated ${exports.length} public pages; no API calls or writes.`,
		)
		return
	}
	const { default: SupermemoryClient } = await import("supermemory")
	const client = new SupermemoryClient({
		apiKey,
		maxRetries: 2,
		timeout: 30_000,
	})
	const documents = await listDocuments(client, containerTag)
	const owned = documents.filter((document) => {
		const metadata = metadataOf(document)
		return metadata.source === source && metadata.siteUrl === canonicalSite.href
	})
	const byCustomId = new Map<string, Document>()
	for (const document of documents) {
		if (!document.customId) continue
		if (byCustomId.has(document.customId))
			throw new Error("Duplicate document customId; refusing to sync")
		byCustomId.set(document.customId, document)
	}
	for (const page of exports) {
		const existing = byCustomId.get(page.customId)
		if (existing && !owned.includes(existing)) {
			throw new Error(
				`Custom ID collision for ${page.url}; refusing to overwrite`,
			)
		}
	}
	let added = 0
	let updated = 0
	let unchanged = 0
	await mapConcurrent(exports, async (page) => {
		const existing = byCustomId.get(page.customId)
		const previous = existing ? metadataOf(existing) : {}
		const same =
			existing &&
			Object.entries(page.metadata).every(
				([key, value]) => previous[key] === value,
			)
		if (same && existing.status !== "failed") {
			await waitUntilDone(client, existing.id, page.metadata.contentHash)
			unchanged++
			return
		}
		if (existing && !["done", "failed"].includes(existing.status)) {
			await waitUntilDone(client, existing.id)
		}
		const payload: DocumentAddParams &
			DocumentUpdateParams & { taskType: "superrag" } = {
			content: page.content,
			customId: page.customId,
			containerTag,
			metadata: page.metadata,
			taskType: "superrag",
		}
		const result = await api(`Sync ${page.url}`, () =>
			existing
				? client.documents.update(existing.id, payload)
				: client.documents.add(payload),
		)
		if (!result.id)
			throw new Error(`Missing document ID after syncing ${page.url}`)
		await waitUntilDone(client, result.id, page.metadata.contentHash)
		if (existing) updated++
		else added++
		console.log(`Indexed ${page.url}`)
	})
	if ((await fetchMarkdown(inventoryUrl)) !== inventory) {
		throw new Error(
			"/llms.txt changed during sync; no removed pages were deleted. Run sync again.",
		)
	}
	const currentIds = new Set(exports.map((page) => page.customId))
	const removed = owned.filter(
		(document) => !document.customId || !currentIds.has(document.customId),
	)
	await mapConcurrent(removed, async (document) => {
		await api(`Delete ${document.id}`, () =>
			client.documents.delete(document.id),
		)
	})
	console.log(
		`Sync complete: ${added} added, ${updated} replaced, ${unchanged} unchanged, ${removed.length} removed.`,
	)
}

main().catch((error: unknown) => {
	console.error(
		error instanceof Error ? error.message : "Documentation sync failed",
	)
	process.exitCode = 1
})
