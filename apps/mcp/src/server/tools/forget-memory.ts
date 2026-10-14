import {
	CLIENT_CAPABILITIES_META_KEY,
	type CallToolResult,
	type InputRequiredResult,
	inputRequired,
	inputResponse,
	type ServerContext,
} from "@modelcontextprotocol/server"
import { z } from "zod"
import type { ForgetCandidate } from "../client"
import { optionalNamespaceSchema } from "../namespace"
import { MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import {
	legacyNamespaceInput,
	namespaceArg,
	withLegacyNamespace,
} from "./compat"
import { forgetMemoryOutputSchema } from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

const CONFIRM_KEY = "confirm_forget"

export interface ForgetMemoryArgs {
	content?: string
	id?: string
	confirm?: boolean
	namespace?: string
	containerTag?: string
}

// Stateless legacy requests cannot receive elicitation, so they use explicit two-call confirmation.
function canElicit(context: ServerContext | undefined): boolean {
	const envelope = context?.mcpReq?.envelope
	if (!envelope) return false
	const capabilities = Reflect.get(envelope, CLIENT_CAPABILITIES_META_KEY)
	if (!capabilities || typeof capabilities !== "object") return false
	const elicitation = Reflect.get(capabilities, "elicitation")
	return Boolean(
		elicitation &&
			typeof elicitation === "object" &&
			(Reflect.get(elicitation, "form") !== undefined ||
				Reflect.get(elicitation, "url") === undefined),
	)
}

function askToConfirm(
	candidate: ForgetCandidate,
	namespace: string,
): InputRequiredResult {
	return inputRequired({
		inputRequests: {
			[CONFIRM_KEY]: inputRequired.elicit({
				message: `Forget this memory from "${namespace}"?\n\n"${candidate.memory}"`,
				requestedSchema: {
					type: "object",
					properties: {
						confirm: {
							type: "boolean",
							title: "Yes, forget this memory",
						},
					},
					required: ["confirm"],
				},
			}),
		},
		requestState: candidate.id,
	})
}

function result(
	namespace: string,
	status: "forgotten" | "confirmation_required" | "cancelled" | "not_found",
	message: string,
	options: { success?: boolean; candidate?: ForgetCandidate } = {},
): CallToolResult {
	return {
		content: [textContent(message)],
		structuredContent: withLegacyNamespace({
			action: "forget" as const,
			success: options.success ?? false,
			namespace,
			message,
			status,
			id: options.candidate?.id,
			memory: options.candidate?.memory,
		}),
	}
}

export async function forgetMemory(
	deps: ToolDeps,
	args: ForgetMemoryArgs,
	context?: ServerContext,
): Promise<CallToolResult | InputRequiredResult> {
	try {
		if (!args.id && !args.content) {
			throw new Error("Provide the memory id or content to forget.")
		}
		const namespace = await deps.resolveNamespace(namespaceArg(args))
		const client = deps.getClient(namespace)
		const candidate = args.id
			? await client.getMemory(args.id)
			: await client.findMemoryToForget(args.content ?? "")
		if (!candidate) {
			return result(
				namespace,
				"not_found",
				"No matching memory found to forget.",
			)
		}

		if (canElicit(context)) {
			const answer = inputResponse(context?.mcpReq.inputResponses, CONFIRM_KEY)
			const askedId = context?.mcpReq.requestState?.()
			if (answer.kind !== "elicit" || askedId !== candidate.id) {
				return askToConfirm(candidate, namespace)
			}
			if (answer.action !== "accept" || answer.content?.confirm !== true) {
				return result(
					namespace,
					"cancelled",
					"The user chose to keep this memory. Nothing was forgotten.",
					{ candidate },
				)
			}
		} else if (!(args.confirm === true && args.id === candidate.id)) {
			return result(
				namespace,
				"confirmation_required",
				`Nothing forgotten yet. Show the user this memory and ask whether to forget it:\n"${candidate.memory}" (ID: ${candidate.id})\nOnly if they say yes, call forget_memory again with id "${candidate.id}" and confirm: true.`,
				{ candidate },
			)
		}

		const forgotten = await client.forgetMemoryById(candidate)
		return result(
			forgotten.namespace,
			forgotten.success ? "forgotten" : "not_found",
			forgotten.message,
			{ success: forgotten.success, candidate },
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
				"Forget one memory in the user's ACTIVE space. Forgetting always needs the user's confirmation: clients that support elicitation show the user a confirmation prompt; otherwise the first call only returns the matching memory, and you must show it to the user and call again with its id and confirm: true once they agree. Prefer passing an id from search_memory or list_memories; content is matched semantically. Pass namespace only to override the active space.",
			inputSchema: z.object({
				content: z
					.string()
					.max(200000, "Content exceeds maximum length")
					.optional()
					.describe(
						"Text describing the memory to forget, matched semantically",
					),
				id: z
					.string()
					.optional()
					.describe(
						"Exact memory ID to forget, from search_memory or list_memories",
					),
				confirm: z
					.boolean()
					.optional()
					.describe(
						"Set to true only after the user explicitly agreed to forget the memory with this id",
					),
				namespace: optionalNamespaceSchema,
				...legacyNamespaceInput,
			}),
			outputSchema: forgetMemoryOutputSchema,
			annotations: MEMORY_TOOL_ANNOTATIONS,
		},
		async (args, context) => forgetMemory(deps, args, context),
	)
}
