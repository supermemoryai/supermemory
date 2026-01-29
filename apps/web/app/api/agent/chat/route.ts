import { query } from "@anthropic-ai/claude-agent-sdk"
import { cookies } from "next/headers"
import { createSupermemoryMcpServer, SUPERMEMORY_SYSTEM_PROMPT } from "@/lib/agent/tools"
import type { ChatRequest, AgentMessagePart } from "@/lib/agent/types"

export const runtime = "nodejs"

export async function POST(req: Request) {
	try {
		const body: ChatRequest = await req.json()
		const { messages, metadata } = body

		const cookieStore = await cookies()
		const cookieHeader = cookieStore
			.getAll()
			.map((c) => `${c.name}=${c.value}`)
			.join("; ")

		const supermemoryServer = createSupermemoryMcpServer({
			cookies: cookieHeader,
			projectId: metadata.projectId,
		})

		const encoder = new TextEncoder()
		const stream = new ReadableStream({
			async start(controller) {
				try {
					const conversationText = messages
						.map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
						.join("\n\n")

					const lastUserMessage = messages.filter((m) => m.role === "user").pop()
					const promptText = lastUserMessage?.content ?? conversationText

					const result = query({
						prompt: promptText,
						options: {
							systemPrompt: `${SUPERMEMORY_SYSTEM_PROMPT}\n\nConversation history:\n${conversationText}`,
							model: "claude-sonnet-4-20250514",
							mcpServers: {
								supermemory: supermemoryServer,
							},
							allowedTools: [
								"mcp__supermemory__searchMemories",
								"mcp__supermemory__addMemory",
							],
							permissionMode: "bypassPermissions",
							allowDangerouslySkipPermissions: true,
							includePartialMessages: true,
						},
					})

					for await (const message of result) {
						const parts: AgentMessagePart[] = []
						const msgType = message.type

						if (msgType === "assistant") {
							const assistantMsg = message as {
								type: "assistant"
								message: {
									id?: string
									content: string | Array<{ type: string; text?: string }>
								}
							}
							const textContent =
								typeof assistantMsg.message.content === "string"
									? assistantMsg.message.content
									: Array.isArray(assistantMsg.message.content)
										? assistantMsg.message.content
												.filter((c) => c.type === "text" && typeof c.text === "string")
												.map((c) => c.text as string)
												.join("")
										: ""

							if (textContent) {
								parts.push({ type: "text", text: textContent })
							}

							const event = {
								type: "assistant",
								id: assistantMsg.message.id ?? crypto.randomUUID(),
								role: "assistant",
								parts,
							}
							controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
						}

						if (msgType === "result") {
							const resultMsg = message as {
								type: "result"
								subtype?: string
								tool_name?: string
								tool_input?: Record<string, unknown>
								tool_result?: {
									content?: Array<{ type: string; text?: string }>
								}
							}

							if (resultMsg.subtype === "tool_use" && resultMsg.tool_name) {
								const toolName = resultMsg.tool_name

								if (toolName === "mcp__supermemory__searchMemories") {
									parts.push({
										type: "tool-searchMemories",
										state: "input-available",
										input: resultMsg.tool_input as { query: string; limit?: number },
									})
								} else if (toolName === "mcp__supermemory__addMemory") {
									parts.push({
										type: "tool-addMemory",
										state: "input-available",
										input: resultMsg.tool_input as { content: string; title?: string },
									})
								}

								if (parts.length > 0) {
									const event = { type: "tool_use", parts }
									controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
								}
							}

							if (resultMsg.subtype === "tool_result" && resultMsg.tool_result?.content) {
								try {
									const resultText = resultMsg.tool_result.content
										.filter((c) => c.type === "text")
										.map((c) => c.text)
										.join("")

									if (resultText) {
										const parsed = JSON.parse(resultText)

										if ("count" in parsed && "results" in parsed) {
											parts.push({
												type: "tool-searchMemories",
												state: "output-available",
												output: parsed,
											})
										} else if ("status" in parsed) {
											parts.push({
												type: "tool-addMemory",
												state: "output-available",
												output: parsed,
											})
										}
									}
								} catch {
									// Ignore parse errors
								}

								if (parts.length > 0) {
									const event = { type: "tool_result", parts }
									controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
								}
							}
						}
					}

					controller.enqueue(encoder.encode("data: [DONE]\n\n"))
					controller.close()
				} catch (error) {
					console.error("Agent stream error:", error)
					const errorEvent = {
						type: "error",
						error: error instanceof Error ? error.message : "Unknown error",
					}
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
					controller.close()
				}
			},
		})

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		})
	} catch (error) {
		console.error("Agent route error:", error)
		return Response.json(
			{ error: error instanceof Error ? error.message : "Internal server error" },
			{ status: 500 }
		)
	}
}
