import { z } from "zod"
import { getMemoryText } from "../client"
import { optionalNamespaceSchema } from "../namespace"
import { MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import {
	legacyNamespaceInput,
	namespaceArg,
	withLegacyNamespace,
} from "./compat"
import { forgetMemoryOutputSchema } from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

const MAX_IDS = 100
const CANDIDATE_LIMIT = 5

type ForgetArgs = {
	ids?: string[]
	content?: string
	namespace?: string
	containerTag?: string
}

function forgetResult(
	namespace: string,
	success: boolean,
	message: string,
	extra: Record<string, unknown> = {},
) {
	return {
		content: [textContent(message)],
		structuredContent: withLegacyNamespace({
			action: "forget" as const,
			success,
			namespace,
			message,
			...extra,
		}),
	}
}

async function forgetIds(deps: ToolDeps, namespace: string, ids: string[]) {
	const result = await deps.getClient(namespace).forgetByIds(ids)
	const lines = result.forgotten.map((m) => `- ${m.id}: "${m.memory}"`)
	for (const e of result.errors)
		lines.push(`- ${e.id}: not forgotten (${e.error})`)
	const count = result.forgotten.length
	const head =
		count > 0
			? `Forgot ${count} memor${count === 1 ? "y" : "ies"}.`
			: "No memories were forgotten."
	return forgetResult(
		result.namespace,
		count > 0,
		[head, ...lines].join("\n"),
		{
			id: result.forgotten[0]?.id,
			forgotten: result.forgotten,
			errors: result.errors,
		},
	)
}

export async function forgetMemory(deps: ToolDeps, args: ForgetArgs) {
	try {
		const namespace = await deps.resolveNamespace(namespaceArg(args))
		if (args.ids !== undefined) {
			const ids = [...new Set(args.ids.map((id) => id.trim()))]
			if (ids.length === 0 || ids.length > MAX_IDS || ids.some((id) => !id)) {
				throw new Error(`Pass between 1 and ${MAX_IDS} nonempty memory IDs.`)
			}
			return await forgetIds(deps, namespace, ids)
		}

		const content = args.content
		if (!content?.trim()) {
			return forgetResult(
				namespace,
				false,
				"Pass ids (from search_memory) to forget memories.",
			)
		}

		const search = await deps
			.getClient(namespace)
			.search(content, CANDIDATE_LIMIT)
		const candidates = search.results
			.filter((r) => "memory" in r)
			.map((r) => ({
				id: r.id,
				text: getMemoryText(r),
				similarity: r.similarity,
			}))
		const exact = candidates.find((c) => c.text === content)
		if (exact) return await forgetIds(deps, namespace, [exact.id])

		if (candidates.length === 0) {
			return forgetResult(
				namespace,
				false,
				"Nothing was forgotten. No matching memory found.",
				{ candidates },
			)
		}
		const lines = candidates.map(
			(c) => `- ${c.id} [${(c.similarity * 100).toFixed(0)}%] ${c.text}`,
		)
		return forgetResult(
			namespace,
			false,
			[
				"Nothing was forgotten yet. Closest memories:",
				...lines,
				"Call forget_memory again with the ids to forget.",
			].join("\n"),
			{ candidates },
		)
	} catch (error) {
		return deps.errorResult(error)
	}
}

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"forget_memory",
		{
			description:
				"Forget memories by ID in the user's ACTIVE space. Find the IDs with search_memory first, then pass them in ids. If you pass only content, an exact text match is forgotten; otherwise nothing is forgotten and the closest memories are returned with their IDs so you can choose. Use when information is outdated or the user asks to remove it. Pass namespace only to override the active space.",
			inputSchema: z.object({
				ids: z
					.array(z.string().trim().min(1))
					.min(1)
					.max(MAX_IDS)
					.optional()
					.describe("IDs of the memories to forget, from search_memory"),
				content: z
					.string()
					.max(200000, "Content exceeds maximum length")
					.optional()
					.describe(
						"Text of the memory to forget. Used only when ids is not given.",
					),
				namespace: optionalNamespaceSchema,
				...legacyNamespaceInput,
			}),
			outputSchema: forgetMemoryOutputSchema,
			annotations: MEMORY_TOOL_ANNOTATIONS,
		},
		async (args) => forgetMemory(deps, args),
	)
}
