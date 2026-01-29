import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"
import type { SearchMemoriesOutput, AddMemoryOutput } from "./types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

interface ToolContext {
	cookies: string
	projectId: string
}

export function createSupermemoryMcpServer(context: ToolContext) {
	const searchMemoriesTool = tool(
		"searchMemories",
		"Search through user's memories/documents to find relevant information. Use this when you need context about something the user has saved.",
		{
			query: z.string().describe("The search query to find relevant memories"),
			limit: z.number().min(1).max(20).optional().describe("Maximum number of results to return (default: 5)"),
			containerTags: z.array(z.string()).optional().describe("Filter by container tags"),
		},
		async (args): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
			try {
				const response = await fetch(`${BACKEND_URL}/v3/search`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Cookie: context.cookies,
						"X-Project-Id": context.projectId,
					},
					body: JSON.stringify({
						q: args.query,
						limit: args.limit ?? 5,
						containerTags: args.containerTags,
					}),
				})

				if (!response.ok) {
					throw new Error(`Search failed: ${response.statusText}`)
				}

				const data = await response.json()
				const results = data.results ?? data.documents ?? []

				const output: SearchMemoriesOutput = {
					count: results.length,
					results: results.map((r: {
						id?: string
						documentId?: string
						title?: string
						content?: string
						chunk?: string
						url?: string
						score?: number
					}) => ({
						documentId: r.id ?? r.documentId ?? "",
						title: r.title,
						content: r.content ?? r.chunk,
						url: r.url,
						score: r.score,
					})),
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(output),
						},
					],
				}
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								count: 0,
								results: [],
								error: error instanceof Error ? error.message : "Search failed",
							}),
						},
					],
				}
			}
		}
	)

	const addMemoryTool = tool(
		"addMemory",
		"Add a new memory/document for the user. Use this when the user wants to save information for later.",
		{
			content: z.string().describe("The content to save as a memory"),
			title: z.string().optional().describe("Optional title for the memory"),
			url: z.string().optional().describe("Optional URL associated with the content"),
			containerTags: z.array(z.string()).optional().describe("Tags to organize the memory"),
		},
		async (args): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
			try {
				const response = await fetch(`${BACKEND_URL}/v3/documents`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Cookie: context.cookies,
						"X-Project-Id": context.projectId,
					},
					body: JSON.stringify({
						content: args.content,
						title: args.title,
						url: args.url,
						containerTags: args.containerTags,
					}),
				})

				if (!response.ok) {
					throw new Error(`Add memory failed: ${response.statusText}`)
				}

				const data = await response.json()
				const output: AddMemoryOutput = {
					id: data.id ?? data.documentId ?? "",
					status: "success",
					message: "Memory added successfully",
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(output),
						},
					],
				}
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: "",
								status: "error",
								message: error instanceof Error ? error.message : "Failed to add memory",
							}),
						},
					],
				}
			}
		}
	)

	return createSdkMcpServer({
		name: "supermemory",
		version: "1.0.0",
		tools: [searchMemoriesTool, addMemoryTool],
	})
}

export const SUPERMEMORY_SYSTEM_PROMPT = `You are Nova, a helpful AI assistant for Supermemory. You help users search and manage their memories - content they've saved from the web, notes, documents, and other information.

When a user asks a question:
1. First search their memories to find relevant context using the searchMemories tool
2. Use that context to provide helpful, accurate answers
3. If the user wants to save something, use the addMemory tool

Be conversational, helpful, and concise. Reference specific memories when relevant.`
